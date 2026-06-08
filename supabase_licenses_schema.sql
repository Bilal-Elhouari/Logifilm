-- Logifilm server-side license validation.
-- Run once in the Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.license_keys (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null unique,
  label text not null,
  status text not null default 'active'
    check (status in ('active', 'suspended', 'revoked')),
  max_devices integer not null default 1 check (max_devices > 0),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.license_activations (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.license_keys(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  device_name text,
  activated_at timestamptz not null default now(),
  last_checked_at timestamptz not null default now(),
  unique (license_id, user_id, device_id)
);

create index if not exists license_activations_lookup_idx
  on public.license_activations (user_id, device_id);

alter table public.license_keys enable row level security;
alter table public.license_activations enable row level security;

revoke all on public.license_keys from anon, authenticated;
revoke all on public.license_activations from anon, authenticated;

create or replace function public.activate_license(
  p_key text,
  p_device_id text,
  p_device_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_license public.license_keys%rowtype;
  v_device_count integer;
begin
  if v_user_id is null then
    return jsonb_build_object('valid', false, 'reason', 'authentication_required');
  end if;

  select *
  into v_license
  from public.license_keys
  where key_hash = encode(digest(upper(trim(p_key)), 'sha256'), 'hex');

  if v_license.id is null then
    return jsonb_build_object('valid', false, 'reason', 'invalid_key');
  end if;
  if v_license.status <> 'active' then
    return jsonb_build_object('valid', false, 'reason', v_license.status);
  end if;
  if v_license.expires_at is not null and v_license.expires_at <= now() then
    return jsonb_build_object('valid', false, 'reason', 'expired');
  end if;

  if exists (
    select 1
    from public.license_activations
    where license_id = v_license.id
      and user_id = v_user_id
      and device_id = p_device_id
  ) then
    update public.license_activations
    set last_checked_at = now(), device_name = coalesce(p_device_name, device_name)
    where license_id = v_license.id
      and user_id = v_user_id
      and device_id = p_device_id;
  else
    select count(distinct device_id)
    into v_device_count
    from public.license_activations
    where license_id = v_license.id;

    if v_device_count >= v_license.max_devices then
      return jsonb_build_object('valid', false, 'reason', 'device_limit');
    end if;

    insert into public.license_activations (license_id, user_id, device_id, device_name)
    values (v_license.id, v_user_id, p_device_id, p_device_name);
  end if;

  return jsonb_build_object(
    'valid', true,
    'label', v_license.label,
    'expires_at', v_license.expires_at,
    'max_devices', v_license.max_devices
  );
end;
$$;

create or replace function public.check_license(p_device_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_license public.license_keys%rowtype;
  v_activation_id uuid;
  v_license_id uuid;
begin
  if v_user_id is null then
    return jsonb_build_object('valid', false, 'reason', 'authentication_required');
  end if;

  select la.id, la.license_id
  into v_activation_id, v_license_id
  from public.license_activations la
  where la.user_id = v_user_id
    and la.device_id = p_device_id
  order by la.activated_at desc
  limit 1;

  if v_activation_id is null then
    return jsonb_build_object('valid', false, 'reason', 'not_activated');
  end if;

  select *
  into v_license
  from public.license_keys
  where id = v_license_id;

  if v_license.status <> 'active' then
    return jsonb_build_object('valid', false, 'reason', v_license.status);
  end if;
  if v_license.expires_at is not null and v_license.expires_at <= now() then
    return jsonb_build_object('valid', false, 'reason', 'expired');
  end if;

  update public.license_activations
  set last_checked_at = now()
  where id = v_activation_id;

  return jsonb_build_object(
    'valid', true,
    'label', v_license.label,
    'expires_at', v_license.expires_at,
    'max_devices', v_license.max_devices
  );
end;
$$;

revoke all on function public.activate_license(text, text, text) from public;
revoke all on function public.check_license(text) from public;
grant execute on function public.activate_license(text, text, text) to authenticated;
grant execute on function public.check_license(text) to authenticated;

create or replace function public.admin_create_license(
  p_label text,
  p_max_devices integer default 1,
  p_expires_at timestamptz default null
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_key text;
begin
  v_key := 'LOGIFILM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
    || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.license_keys (key_hash, label, max_devices, expires_at)
  values (
    encode(digest(v_key, 'sha256'), 'hex'),
    p_label,
    p_max_devices,
    p_expires_at
  );

  return v_key;
end;
$$;

revoke all on function public.admin_create_license(text, integer, timestamptz) from public, anon, authenticated;

-- Run from the Supabase SQL editor to create a key. Save the returned key:
-- it is shown once and only its SHA-256 hash remains in the database.
--
-- select public.admin_create_license(
--   'Client name',
--   3,
--   now() + interval '1 year'
-- );
