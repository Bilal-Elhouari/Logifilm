-- Logifilm: team roles. Run AFTER 20261121_account_approval.sql, in the Supabase
-- SQL editor. Safe to run more than once.
--
-- Two roles only:
--   * Administrator (table platform_admins): the team leader and the colleagues they
--     promote. Administrators see and manage EVERY company: create, rename, delete,
--     give colleagues access to a company or take it away, approve new accounts and
--     name or remove other administrators (never themselves, never the last one).
--   * Colleague (every other approved account): sees only the companies an
--     administrator gave them access to, sees everything inside them and can work
--     there (projects, crew members, contracts). Cannot create, rename or delete a
--     company, and cannot give anybody access.

begin;

-- Who may see / work in a company -------------------------------------------------
create or replace function public.is_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_active_license(auth.uid()) and (
    public.is_platform_admin()
    or exists (
      select 1 from public.company_members member
      where member.company_id = p_company_id and member.user_id = auth.uid()
    )
  );
$$;

-- Who may manage a company: administrators only ------------------------------------
create or replace function public.can_manage_company(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_active_license(auth.uid()) and public.is_platform_admin();
$$;

create or replace function public.is_licensed_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_active_license(auth.uid()) and public.is_platform_admin();
$$;

-- Companies: everybody reads what they have access to, only administrators write ---
drop policy if exists "Logifilm companies: read owner" on public.companies;
drop policy if exists "Logifilm companies: create licensed owner" on public.companies;
drop policy if exists "Logifilm companies: update managers" on public.companies;
drop policy if exists "Logifilm companies: delete owners" on public.companies;
drop policy if exists "Logifilm companies: create admins" on public.companies;
drop policy if exists "Logifilm companies: update admins" on public.companies;
drop policy if exists "Logifilm companies: delete admins" on public.companies;

create policy "Logifilm companies: create admins"
on public.companies for insert to authenticated
with check (public.is_licensed_admin() and owner_user_id = auth.uid());

create policy "Logifilm companies: update admins"
on public.companies for update to authenticated
using (public.is_licensed_admin())
with check (public.is_licensed_admin());

create policy "Logifilm companies: delete admins"
on public.companies for delete to authenticated
using (public.is_licensed_admin());

-- Any administrator may hand a company over (the creator is only kept for history).
drop trigger if exists companies_guard_owner_change on public.companies;

-- Access to a company: administrators only, through the functions below -----------
drop policy if exists "Logifilm memberships: manage admins" on public.company_members;
drop policy if exists "Logifilm memberships: add by managers" on public.company_members;
drop policy if exists "Logifilm memberships: change by managers" on public.company_members;
drop policy if exists "Logifilm memberships: remove by managers" on public.company_members;
-- "Logifilm memberships: read same company" stays: people of a company see each other.

-- Team list for administrators ------------------------------------------------------
-- Every account that can use the app (active licence) or is an administrator.
create or replace function public.admin_team()
returns table (user_id uuid, email text, is_admin boolean, licence_expires_at timestamptz, company_ids uuid[])
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_licensed_admin() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  return query
    select u.id,
           u.email::text,
           exists (select 1 from public.platform_admins p where p.user_id = u.id),
           (select max(k.expires_at) from public.license_activations a
              join public.license_keys k on k.id = a.license_id
             where a.user_id = u.id and k.status = 'active'
               and not exists (select 1 from public.license_activations a2
                                 join public.license_keys k2 on k2.id = a2.license_id
                                where a2.user_id = u.id and k2.status = 'active' and k2.expires_at is null)),
           coalesce((select array_agg(m.company_id order by m.company_id)
                       from public.company_members m where m.user_id = u.id), '{}')
    from auth.users u
    where exists (select 1 from public.platform_admins p where p.user_id = u.id)
       or exists (select 1 from public.license_activations a
                    join public.license_keys k on k.id = a.license_id
                   where a.user_id = u.id and k.status = 'active'
                     and (k.expires_at is null or k.expires_at > now()))
    order by lower(u.email);
end;
$$;

-- Give a colleague access to a company, or take it away ----------------------------
create or replace function public.admin_set_company_access(p_user_id uuid, p_company_id uuid, p_grant boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_licensed_admin() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.companies where id = p_company_id) then
    raise exception 'Company not found.';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Account not found.';
  end if;

  if p_grant then
    insert into public.company_members (company_id, user_id, role)
    values (p_company_id, p_user_id, 'member')
    on conflict (company_id, user_id) do nothing;
  else
    delete from public.company_members where company_id = p_company_id and user_id = p_user_id;
  end if;
end;
$$;

-- Name or remove an administrator ---------------------------------------------------
create or replace function public.admin_set_platform_admin(p_user_id uuid, p_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_licensed_admin() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot change your own administrator role.';
  end if;

  if p_admin then
    if not exists (select 1 from auth.users where id = p_user_id) then
      raise exception 'Account not found.';
    end if;
    insert into public.platform_admins (user_id) values (p_user_id) on conflict do nothing;
  else
    -- Serialise concurrent removals so the team can never end up without an administrator.
    perform 1 from public.platform_admins for update;
    if (select count(*) from public.platform_admins where user_id <> p_user_id) = 0 then
      raise exception 'The team needs at least one administrator.';
    end if;
    delete from public.platform_admins where user_id = p_user_id;
  end if;
end;
$$;

-- Delete a company and everything in it ---------------------------------------------
-- The app removes the contract PDFs from Storage first, while it can still read them.
create or replace function public.admin_delete_company(p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_licensed_admin() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  if to_regclass('public.contracts') is not null then
    delete from public.contracts c using public.crew_members m
    where c.crew_member_id = m.id and m.company_id = p_company_id;
  end if;
  delete from public.crew_members where company_id = p_company_id;
  delete from public.jobs where company_id = p_company_id;
  delete from public.company_members where company_id = p_company_id;
  delete from public.companies where id = p_company_id;
  if not found then
    raise exception 'Company not found.';
  end if;
end;
$$;

-- Approval: the administrator can also make the new account an administrator -------
drop function if exists public.admin_decide_request(uuid, boolean, integer);
create or replace function public.admin_decide_request(
  p_request_id uuid,
  p_approve boolean,
  p_valid_days integer default null,
  p_make_admin boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_request public.license_requests%rowtype;
  v_key text;
  v_license_id uuid;
  v_expires timestamptz;
begin
  if not public.is_licensed_admin() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  if p_valid_days is not null and p_valid_days <= 0 then
    raise exception 'The duration must be a positive number of days.';
  end if;

  select * into v_request from public.license_requests where id = p_request_id for update;
  if v_request.id is null then
    raise exception 'Request not found.';
  end if;
  if v_request.status <> 'pending' then
    return jsonb_build_object('ok', false, 'reason', 'already_decided', 'status', v_request.status);
  end if;

  if not p_approve then
    update public.license_requests
    set status = 'rejected', decided_at = now(), decided_by = auth.uid()
    where id = p_request_id;
    return jsonb_build_object('ok', true, 'status', 'rejected');
  end if;

  v_expires := case when p_valid_days is null then null else now() + make_interval(days => p_valid_days) end;
  -- The key itself is never shown: it is activated on the account straight away.
  v_key := 'LOGIFILM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
    || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.license_keys (key_hash, label, max_accounts, expires_at)
  values (encode(digest(v_key, 'sha256'), 'hex'), coalesce(v_request.email, 'Approved account'), 1, v_expires)
  returning id into v_license_id;

  -- Older databases still have the device columns from device-based licences.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'license_activations' and column_name = 'device_id'
  ) then
    execute 'insert into public.license_activations (license_id, user_id, device_id, device_name)
             values ($1, $2, ''account-license'', ''Account license'')
             on conflict do nothing'
      using v_license_id, v_request.user_id;
  else
    insert into public.license_activations (license_id, user_id)
    values (v_license_id, v_request.user_id)
    on conflict do nothing;
  end if;

  if p_make_admin then
    insert into public.platform_admins (user_id) values (v_request.user_id) on conflict do nothing;
  end if;

  update public.license_requests
  set status = 'approved', decided_at = now(), decided_by = auth.uid(), license_id = v_license_id
  where id = p_request_id;

  return jsonb_build_object('ok', true, 'status', 'approved', 'expires_at', v_expires, 'admin', p_make_admin);
end;
$$;

revoke all on function public.is_licensed_admin() from public, anon;
revoke all on function public.admin_team() from public, anon;
revoke all on function public.admin_set_company_access(uuid, uuid, boolean) from public, anon;
revoke all on function public.admin_set_platform_admin(uuid, boolean) from public, anon;
revoke all on function public.admin_delete_company(uuid) from public, anon;
revoke all on function public.admin_decide_request(uuid, boolean, integer, boolean) from public, anon;
grant execute on function public.is_licensed_admin() to authenticated;
grant execute on function public.admin_team() to authenticated;
grant execute on function public.admin_set_company_access(uuid, uuid, boolean) to authenticated;
grant execute on function public.admin_set_platform_admin(uuid, boolean) to authenticated;
grant execute on function public.admin_delete_company(uuid) to authenticated;
grant execute on function public.admin_decide_request(uuid, boolean, integer, boolean) to authenticated;

commit;
