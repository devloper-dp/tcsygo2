create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('card', 'upi', 'wallet', 'cash')),
  last_four text,
  card_brand text,
  upi_id text,
  wallet_type text,
  provider text,
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table public.payment_methods enable row level security;

-- Drop existing policies to avoid errors on re-run
drop policy if exists "Users can view their own payment methods" on public.payment_methods;
drop policy if exists "Users can insert their own payment methods" on public.payment_methods;
drop policy if exists "Users can update their own payment methods" on public.payment_methods;
drop policy if exists "Users can delete their own payment methods" on public.payment_methods;

create policy "Users can view their own payment methods"
  on public.payment_methods for select
  using (auth.uid() = user_id);

create policy "Users can insert their own payment methods"
  on public.payment_methods for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own payment methods"
  on public.payment_methods for update
  using (auth.uid() = user_id);

create policy "Users can delete their own payment methods"
  on public.payment_methods for delete
  using (auth.uid() = user_id);

-- Grants
grant all on public.payment_methods to postgres;
grant all on public.payment_methods to authenticated;
grant all on public.payment_methods to service_role;
