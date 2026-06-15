-- Convert device-bound licenses to account-bound licenses.
-- A licensed account can use Logifilm on any number of computers.

begin;

alter table public.license_keys
  add column if not exists max_accounts integer not null default 1
  check (max_accounts > 0);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'license_keys'
      and column_name = 'max_devices'
  ) then
    update public.license_keys
    set max_accounts = greatest(1, max_devices);
  end if;
end;
$$;

delete from public.license_activations older
using public.license_activations newer
where older.license_id = newer.license_id
  and older.user_id = newer.user_id
  and older.activated_at < newer.activated_at;

alter table public.license_activations
  drop constraint if exists license_activations_license_id_user_id_device_id_key;

create unique index if not exists license_activations_account_unique_idx
  on public.license_activations (license_id, user_id);

create index if not exists license_activations_user_idx
  on public.license_activations (user_id);

create or replace function public.activate_license(p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_license public.license_keys%rowtype;
  v_account_count integer;
begin
  if v_user_id is null then
    return jsonb_build_object('valid', false, 'reason', 'authentication_required');
  end if;

  select * into v_license
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

  perform pg_advisory_xact_lock(hashtextextended(v_license.id::text, 0));

  if not exists (
    select 1 from public.license_activations
    where license_id = v_license.id and user_id = v_user_id
  ) then
    select count(distinct user_id) into v_account_count
    from public.license_activations
    where license_id = v_license.id;

    if v_account_count >= v_license.max_accounts then
      return jsonb_build_object('valid', false, 'reason', 'account_limit');
    end if;

    insert into public.license_activations (license_id, user_id, device_id, device_name)
    values (v_license.id, v_user_id, 'account-license', 'Account license');
  else
    update public.license_activations
    set last_checked_at = now()
    where license_id = v_license.id and user_id = v_user_id;
  end if;

  return jsonb_build_object(
    'valid', true,
    'label', v_license.label,
    'expires_at', v_license.expires_at,
    'max_accounts', v_license.max_accounts
  );
end;
$$;

create or replace function public.check_license()
returns jsonb
language plpgsql
security definer
set search_path = public
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

  select activation.id, activation.license_id
  into v_activation_id, v_license_id
  from public.license_activations activation
  where activation.user_id = v_user_id
  order by activation.activated_at desc
  limit 1;

  if v_activation_id is null then
    return jsonb_build_object('valid', false, 'reason', 'not_activated');
  end if;

  select * into v_license from public.license_keys where id = v_license_id;
  if v_license.status <> 'active' then
    return jsonb_build_object('valid', false, 'reason', v_license.status);
  end if;
  if v_license.expires_at is not null and v_license.expires_at <= now() then
    return jsonb_build_object('valid', false, 'reason', 'expired');
  end if;

  update public.license_activations set last_checked_at = now()
  where id = v_activation_id;

  return jsonb_build_object(
    'valid', true,
    'label', v_license.label,
    'expires_at', v_license.expires_at,
    'max_accounts', v_license.max_accounts
  );
end;
$$;

drop function if exists public.admin_create_license(text, integer, timestamptz);

create function public.admin_create_license(
  p_label text,
  p_max_accounts integer default 1,
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

  insert into public.license_keys (key_hash, label, max_accounts, expires_at)
  values (encode(digest(v_key, 'sha256'), 'hex'), p_label, p_max_accounts, p_expires_at);
  return v_key;
end;
$$;

drop function if exists public.activate_license(text, text, text);
drop function if exists public.check_license(text);

revoke all on function public.activate_license(text) from public;
revoke all on function public.check_license() from public;
revoke all on function public.admin_create_license(text, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.activate_license(text) to authenticated;
grant execute on function public.check_license() to authenticated;

commit;
