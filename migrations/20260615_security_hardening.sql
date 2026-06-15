-- Logifilm security hardening.
-- Run after supabase_licenses_schema.sql and supabase_contracts_schema.sql.
-- Existing companies must be assigned an owner before users can access them.

begin;

alter table public.companies
  add column if not exists owner_user_id uuid references auth.users(id) on delete restrict;

alter table public.companies
  alter column owner_user_id set default auth.uid();

create table if not exists public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

alter table public.company_members enable row level security;

create or replace function public.has_active_license(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.license_activations activation
    join public.license_keys license on license.id = activation.license_id
    where activation.user_id = p_user_id
      and license.status = 'active'
      and (license.expires_at is null or license.expires_at > now())
  );
$$;

create or replace function public.is_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_active_license(auth.uid()) and exists (
    select 1
    from public.company_members member
    where member.company_id = p_company_id
      and member.user_id = auth.uid()
  );
$$;

create or replace function public.can_manage_company(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_active_license(auth.uid()) and exists (
    select 1
    from public.company_members member
    where member.company_id = p_company_id
      and member.user_id = auth.uid()
      and member.role in ('owner', 'admin')
  );
$$;

create or replace function public.add_company_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_user_id is null then
    new.owner_user_id := auth.uid();
  end if;

  insert into public.company_members (company_id, user_id, role)
  values (new.id, new.owner_user_id, 'owner')
  on conflict (company_id, user_id) do update set role = 'owner';
  return new;
end;
$$;

drop trigger if exists companies_add_owner_membership on public.companies;
create trigger companies_add_owner_membership
after insert or update of owner_user_id on public.companies
for each row execute function public.add_company_owner_membership();

insert into public.company_members (company_id, user_id, role)
select id, owner_user_id, 'owner'
from public.companies
where owner_user_id is not null
on conflict (company_id, user_id) do nothing;

create or replace function public.can_access_contract_object(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_crew_member_id uuid;
  v_company_id uuid;
begin
  v_crew_member_id := split_part(p_object_name, '/', 1)::uuid;
  select company_id into v_company_id
  from public.crew_members
  where id = v_crew_member_id;
  return v_company_id is not null and public.is_company_member(v_company_id);
exception when others then
  return false;
end;
$$;

create or replace function public.search_crew_members(p_search text)
returns setof public.crew_members
language sql
stable
security invoker
set search_path = public
as $$
  select member.*
  from public.crew_members member
  where length(trim(p_search)) >= 2
    and (
      member.first_name ilike '%' || trim(p_search) || '%'
      or member.last_name ilike '%' || trim(p_search) || '%'
      or concat_ws(' ', member.first_name, member.last_name) ilike '%' || trim(p_search) || '%'
      or member.position ilike '%' || trim(p_search) || '%'
      or member.department ilike '%' || trim(p_search) || '%'
      or member.project_title ilike '%' || trim(p_search) || '%'
      or member.id_card_number ilike '%' || trim(p_search) || '%'
    )
  order by member.created_at desc
  limit 50;
$$;

revoke all on function public.has_active_license(uuid) from public, anon;
revoke all on function public.is_company_member(uuid) from public, anon;
revoke all on function public.can_manage_company(uuid) from public, anon;
revoke all on function public.can_access_contract_object(text) from public, anon;
revoke all on function public.search_crew_members(text) from public, anon;
grant execute on function public.has_active_license(uuid) to authenticated;
grant execute on function public.is_company_member(uuid) to authenticated;
grant execute on function public.can_manage_company(uuid) to authenticated;
grant execute on function public.can_access_contract_object(text) to authenticated;
grant execute on function public.search_crew_members(text) to authenticated;

commit;

-- Stop before replacing policies until every existing company has an owner.
-- The preparatory changes above remain installed, so assign owners and rerun.
do $$
begin
  if exists (select 1 from public.companies where owner_user_id is null) then
    raise exception using
      message = 'Security policies not installed: assign owner_user_id to every existing company, then rerun this migration.',
      hint = 'Example: update public.companies set owner_user_id = (select id from auth.users where email = ''owner@example.com'') where name = ''Company name'';';
  end if;
end;
$$;

begin;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('companies', 'company_members', 'jobs', 'crew_members', 'contracts', 'profiles')
  loop
    execute format('drop policy if exists %I on %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  end loop;

  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'Logifilm contracts:%'
  loop
    execute format('drop policy if exists %I on %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  end loop;

  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'Authenticated users can upload contract files',
        'Authenticated users can read contract files',
        'Authenticated users can update contract files',
        'Authenticated users can delete contract files'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  end loop;
end;
$$;

alter table public.companies enable row level security;
alter table public.jobs enable row level security;
alter table public.crew_members enable row level security;
alter table public.contracts enable row level security;
alter table public.profiles enable row level security;

create policy "Logifilm companies: read members"
on public.companies for select to authenticated
using (public.is_company_member(id));

create policy "Logifilm companies: create licensed owner"
on public.companies for insert to authenticated
with check (public.has_active_license(auth.uid()) and owner_user_id = auth.uid());

create policy "Logifilm companies: update managers"
on public.companies for update to authenticated
using (public.can_manage_company(id))
with check (public.can_manage_company(id));

create policy "Logifilm companies: delete owners"
on public.companies for delete to authenticated
using (owner_user_id = auth.uid() and public.has_active_license(auth.uid()));

create policy "Logifilm memberships: read same company"
on public.company_members for select to authenticated
using (public.is_company_member(company_id));

create policy "Logifilm memberships: manage admins"
on public.company_members for all to authenticated
using (public.can_manage_company(company_id))
with check (public.can_manage_company(company_id));

create policy "Logifilm jobs: read members"
on public.jobs for select to authenticated
using (public.is_company_member(company_id));

create policy "Logifilm jobs: create members"
on public.jobs for insert to authenticated
with check (public.is_company_member(company_id));

create policy "Logifilm jobs: update members"
on public.jobs for update to authenticated
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create policy "Logifilm jobs: delete managers"
on public.jobs for delete to authenticated
using (public.can_manage_company(company_id));

create policy "Logifilm crew: read members"
on public.crew_members for select to authenticated
using (public.is_company_member(company_id));

create policy "Logifilm crew: create members"
on public.crew_members for insert to authenticated
with check (public.is_company_member(company_id));

create policy "Logifilm crew: update members"
on public.crew_members for update to authenticated
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create policy "Logifilm crew: delete members"
on public.crew_members for delete to authenticated
using (public.is_company_member(company_id));

create policy "Logifilm contracts: read members"
on public.contracts for select to authenticated
using (exists (
  select 1 from public.crew_members member
  where member.id = crew_member_id and public.is_company_member(member.company_id)
));

create policy "Logifilm contracts: create members"
on public.contracts for insert to authenticated
with check (exists (
  select 1 from public.crew_members member
  where member.id = crew_member_id and public.is_company_member(member.company_id)
));

create policy "Logifilm contracts: update members"
on public.contracts for update to authenticated
using (exists (
  select 1 from public.crew_members member
  where member.id = crew_member_id and public.is_company_member(member.company_id)
))
with check (exists (
  select 1 from public.crew_members member
  where member.id = crew_member_id and public.is_company_member(member.company_id)
));

create policy "Logifilm contracts: delete members"
on public.contracts for delete to authenticated
using (exists (
  select 1 from public.crew_members member
  where member.id = crew_member_id and public.is_company_member(member.company_id)
));

create policy "Logifilm profiles: read self"
on public.profiles for select to authenticated using (id = auth.uid());
create policy "Logifilm profiles: create self"
on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "Logifilm profiles: update self"
on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "Logifilm contracts: storage read"
on storage.objects for select to authenticated
using (bucket_id = 'contracts' and public.can_access_contract_object(name));
create policy "Logifilm contracts: storage create"
on storage.objects for insert to authenticated
with check (bucket_id = 'contracts' and public.can_access_contract_object(name));
create policy "Logifilm contracts: storage update"
on storage.objects for update to authenticated
using (bucket_id = 'contracts' and public.can_access_contract_object(name))
with check (bucket_id = 'contracts' and public.can_access_contract_object(name));
create policy "Logifilm contracts: storage delete"
on storage.objects for delete to authenticated
using (bucket_id = 'contracts' and public.can_access_contract_object(name));

revoke all on function public.has_active_license(uuid) from public, anon;
revoke all on function public.is_company_member(uuid) from public, anon;
revoke all on function public.can_manage_company(uuid) from public, anon;
revoke all on function public.can_access_contract_object(text) from public, anon;
revoke all on function public.search_crew_members(text) from public, anon;
grant execute on function public.has_active_license(uuid) to authenticated;
grant execute on function public.is_company_member(uuid) to authenticated;
grant execute on function public.can_manage_company(uuid) to authenticated;
grant execute on function public.can_access_contract_object(text) to authenticated;
grant execute on function public.search_crew_members(text) to authenticated;

commit;

-- If the first run stops because existing companies are unassigned:
-- update public.companies
-- set owner_user_id = (select id from auth.users where email = 'owner@example.com')
-- where name = 'Company name';
