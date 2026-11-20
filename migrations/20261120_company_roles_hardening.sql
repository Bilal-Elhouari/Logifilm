-- Logifilm: close the gaps left by 20260615_security_hardening.sql.
-- Run AFTER migrations/20260615_security_hardening.sql, in the Supabase SQL editor.
--
-- 1. An admin could set companies.owner_user_id to themselves (the trigger then
--    made them owner) and delete the company. Only the current owner may now
--    transfer ownership. The SQL editor / service role (no signed-in user) still can.
-- 2. Admins had full rights on company_members: they could create "owner" rows or
--    remove the real owner. Owner rows can now only be written by the owner trigger.
-- 3. Creating a company from the app (insert + select) failed: the new row was not
--    readable until the owner membership existed. Owners can now read their company.
-- 4. has_active_license(p_user_id) let any signed-in user check another user's
--    licence. It now only answers for the signed-in user.

begin;

-- 1. Ownership transfer: current owner only ------------------------------------
create or replace function public.guard_company_owner_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_user_id is distinct from old.owner_user_id
     and auth.uid() is not null
     and auth.uid() is distinct from old.owner_user_id then
    raise exception 'Only the company owner can transfer ownership.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists companies_guard_owner_change on public.companies;
create trigger companies_guard_owner_change
before update of owner_user_id on public.companies
for each row execute function public.guard_company_owner_change();

-- 2. Memberships: managers handle admins and members, never owner rows ---------
drop policy if exists "Logifilm memberships: manage admins" on public.company_members;
drop policy if exists "Logifilm memberships: add by managers" on public.company_members;
drop policy if exists "Logifilm memberships: change by managers" on public.company_members;
drop policy if exists "Logifilm memberships: remove by managers" on public.company_members;

create policy "Logifilm memberships: add by managers"
on public.company_members for insert to authenticated
with check (public.can_manage_company(company_id) and role <> 'owner');

create policy "Logifilm memberships: change by managers"
on public.company_members for update to authenticated
using (public.can_manage_company(company_id) and role <> 'owner')
with check (public.can_manage_company(company_id) and role <> 'owner');

create policy "Logifilm memberships: remove by managers"
on public.company_members for delete to authenticated
using (public.can_manage_company(company_id) and role <> 'owner');

-- 3. Owners can always read their own company -----------------------------------
-- The app creates a company with insert(...).select(): the new row must be readable
-- at once, before the owner membership row is written by the AFTER INSERT trigger.
drop policy if exists "Logifilm companies: read owner" on public.companies;
create policy "Logifilm companies: read owner"
on public.companies for select to authenticated
using (owner_user_id = auth.uid() and public.has_active_license(auth.uid()));

-- 4. Licence check: only for the signed-in user --------------------------------
create or replace function public.has_active_license(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_user_id = auth.uid() and exists (
    select 1
    from public.license_activations activation
    join public.license_keys license on license.id = activation.license_id
    where activation.user_id = p_user_id
      and license.status = 'active'
      and (license.expires_at is null or license.expires_at > now())
  );
$$;

revoke all on function public.guard_company_owner_change() from public, anon, authenticated;
revoke all on function public.has_active_license(uuid) from public, anon;
grant execute on function public.has_active_license(uuid) to authenticated;

commit;
