create table if not exists public.spin_offers (
  id uuid primary key default gen_random_uuid(), label text not null, description text not null default '', category text, active boolean not null default true, display_order integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.spin_entries (
  id uuid primary key default gen_random_uuid(), offer_id uuid not null references public.spin_offers(id), customer_name text not null, address text not null, phone text not null, reason text not null, created_at timestamptz not null default now(), offer_valid_until timestamptz not null default (now() + interval '30 days'), record_expires_at timestamptz not null default (now() + interval '45 days')
);
create index if not exists spin_entries_record_expires_idx on public.spin_entries(record_expires_at);
alter table public.spin_offers enable row level security;
alter table public.spin_entries enable row level security;
create or replace function public.is_owner_or_manager() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role in ('owner', 'manager'));
$$;
create policy spin_offers_owner_manager_all on public.spin_offers for all using (public.is_owner_or_manager()) with check (public.is_owner_or_manager());
create policy spin_entries_owner_manager_all on public.spin_entries for all using (public.is_owner_or_manager()) with check (public.is_owner_or_manager());

