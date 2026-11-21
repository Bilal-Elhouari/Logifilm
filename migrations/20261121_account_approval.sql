-- Logifilm: new accounts wait for an administrator's approval.
-- Run AFTER 20260615_security_hardening.sql and 20261120_company_roles_hardening.sql,
-- in the Supabase SQL editor. Safe to run more than once.
--
-- 1. Every new sign-up creates an access request (status "pending").
-- 2. Platform administrators (table platform_admins) see the pending requests in the
--    app and approve or decline them.
-- 3. Approving creates a licence (duration chosen by the administrator) and activates
--    it on the account right away: no key to send or type.
-- 4. The person sees "waiting for approval" or "declined" in the app until then.
--
-- After running it, make yourself an administrator:
--   insert into public.platform_admins (user_id)
--   select id from auth.users where email = 'your-email@example.com'
--   on conflict do nothing;

begin;

-- Platform administrators ----------------------------------------------------------
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon, authenticated;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
     and exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

-- Access requests -------------------------------------------------------------------
create table if not exists public.license_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  license_id uuid references public.license_keys(id) on delete set null
);
create index if not exists license_requests_pending_idx
  on public.license_requests (created_at) where status = 'pending';

alter table public.license_requests enable row level security;
revoke all on public.license_requests from anon, authenticated;
-- No direct table access from the app: everything goes through the functions below.

-- A request is created for every new account.
create or replace function public.create_license_request_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.license_requests (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_license_request on auth.users;
create trigger on_auth_user_created_license_request
after insert on auth.users
for each row execute function public.create_license_request_for_new_user();

-- Existing accounts without a licence get a pending request too, so they appear in the list.
insert into public.license_requests (user_id, email)
select u.id, u.email
from auth.users u
where not exists (select 1 from public.license_activations a where a.user_id = u.id)
on conflict (user_id) do nothing;

-- For the signed-in person: where is my request? ------------------------------------
create or replace function public.my_license_request()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select jsonb_build_object('status', r.status, 'created_at', r.created_at, 'decided_at', r.decided_at)
     from public.license_requests r where r.user_id = auth.uid()),
    jsonb_build_object('status', 'none')
  );
$$;

-- For administrators: pending requests ----------------------------------------------
create or replace function public.admin_pending_requests()
returns table (id uuid, email text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  return query
    select r.id, r.email, r.created_at
    from public.license_requests r
    where r.status = 'pending'
    order by r.created_at;
end;
$$;

-- For administrators: approve (with a duration in days, null = no expiry) or decline -
create or replace function public.admin_decide_request(
  p_request_id uuid,
  p_approve boolean,
  p_valid_days integer default null
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
  if not public.is_platform_admin() then
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

  update public.license_requests
  set status = 'approved', decided_at = now(), decided_by = auth.uid(), license_id = v_license_id
  where id = p_request_id;

  return jsonb_build_object('ok', true, 'status', 'approved', 'expires_at', v_expires);
end;
$$;

revoke all on function public.is_platform_admin() from public, anon;
revoke all on function public.create_license_request_for_new_user() from public, anon, authenticated;
revoke all on function public.my_license_request() from public, anon;
revoke all on function public.admin_pending_requests() from public, anon;
revoke all on function public.admin_decide_request(uuid, boolean, integer) from public, anon;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.my_license_request() to authenticated;
grant execute on function public.admin_pending_requests() to authenticated;
grant execute on function public.admin_decide_request(uuid, boolean, integer) to authenticated;

commit;
