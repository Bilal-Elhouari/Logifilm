-- Contract PDF storage for generated crew member contracts.
-- Run this once in the Supabase SQL editor.

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  crew_member_id uuid not null references public.crew_members(id) on delete cascade,
  file_path text not null,
  contract_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contracts_crew_member_id_idx
  on public.contracts (crew_member_id);

create or replace function public.set_contracts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists contracts_set_updated_at on public.contracts;

create trigger contracts_set_updated_at
before update on public.contracts
for each row
execute function public.set_contracts_updated_at();

insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict (id) do nothing;

alter table public.contracts enable row level security;

grant select, insert, update, delete on public.contracts to authenticated;

drop policy if exists "Authenticated users can read contracts" on public.contracts;
create policy "Authenticated users can read contracts"
on public.contracts
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can create contracts" on public.contracts;
create policy "Authenticated users can create contracts"
on public.contracts
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can update contracts" on public.contracts;
create policy "Authenticated users can update contracts"
on public.contracts
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can delete contracts" on public.contracts;
create policy "Authenticated users can delete contracts"
on public.contracts
for delete
to authenticated
using (true);

drop policy if exists "Authenticated users can upload contract files" on storage.objects;
create policy "Authenticated users can upload contract files"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'contracts');

drop policy if exists "Authenticated users can read contract files" on storage.objects;
create policy "Authenticated users can read contract files"
on storage.objects
for select
to authenticated
using (bucket_id = 'contracts');

drop policy if exists "Authenticated users can update contract files" on storage.objects;
create policy "Authenticated users can update contract files"
on storage.objects
for update
to authenticated
using (bucket_id = 'contracts')
with check (bucket_id = 'contracts');

drop policy if exists "Authenticated users can delete contract files" on storage.objects;
create policy "Authenticated users can delete contract files"
on storage.objects
for delete
to authenticated
using (bucket_id = 'contracts');
