-- DormCycle initial schema. Review and run in the Supabase SQL Editor.
-- This is a starting migration; test RLS with separate buyer, seller, and admin accounts.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  role text not null default 'student' check (role in ('student','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'usd',
  category text not null,
  condition text not null check (condition in ('new','like_new','good','fair')),
  campus text,
  status text not null default 'active' check (status in ('draft','active','sold','archived','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (product_id, buyer_id),
  check (buyer_id <> seller_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  message_text text not null check (char_length(message_text) between 1 and 5000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id),
  seller_id uuid not null references public.profiles(id),
  product_id uuid not null references public.products(id),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd',
  status text not null default 'pending' check (status in ('pending','paid','processing','completed','cancelled','refunded')),
  created_at timestamptz not null default now()
);

create table if not exists public.seller_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_account_id text unique,
  onboarding_status text not null default 'not_started',
  payouts_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id),
  stripe_payment_intent_id text unique,
  stripe_charge_id text,
  application_fee_cents integer not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.admin_inventory (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  price_cents integer not null default 0 check (price_cents >= 0),
  quantity integer not null default 0 check (quantity >= 0),
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists products_status_created_idx on public.products(status, created_at desc);
create index if not exists products_seller_idx on public.products(seller_id);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);

-- Enable RLS. Policies below are deliberately conservative starter policies.
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.orders enable row level security;
alter table public.seller_accounts enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.admin_inventory enable row level security;

create policy "Profiles visible to signed-in users" on public.profiles
for select to authenticated using (true);
create policy "Users update own profile" on public.profiles
for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "Active products visible publicly" on public.products
for select using (status = 'active' or auth.uid() = seller_id);
create policy "Seller creates own product" on public.products
for insert to authenticated with check (auth.uid() = seller_id);
create policy "Seller updates own product" on public.products
for update to authenticated using (auth.uid() = seller_id) with check (auth.uid() = seller_id);
create policy "Seller deletes own product" on public.products
for delete to authenticated using (auth.uid() = seller_id);

create policy "Product images visible with active product" on public.product_images
for select using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'active' or p.seller_id = auth.uid())));
create policy "Seller manages own product images" on public.product_images
for all to authenticated using (exists (select 1 from public.products p where p.id = product_id and p.seller_id = auth.uid()))
with check (exists (select 1 from public.products p where p.id = product_id and p.seller_id = auth.uid()));

create policy "Participants read conversations" on public.conversations
for select to authenticated using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "Buyer creates conversation" on public.conversations
for insert to authenticated with check (auth.uid() = buyer_id and exists (select 1 from public.products p where p.id = product_id and p.seller_id = seller_id and p.status = 'active'));

create policy "Participants read messages" on public.messages
for select to authenticated using (exists (select 1 from public.conversations c where c.id = conversation_id and (auth.uid() = c.buyer_id or auth.uid() = c.seller_id)));
create policy "Participants send as themselves" on public.messages
for insert to authenticated with check (auth.uid() = sender_id and exists (select 1 from public.conversations c where c.id = conversation_id and (auth.uid() = c.buyer_id or auth.uid() = c.seller_id)));

create policy "Buyer and seller read own orders" on public.orders
for select to authenticated using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "Buyer reads own notifications" on public.notifications
for select to authenticated using (auth.uid() = user_id);
create policy "Buyer updates own notifications" on public.notifications
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users create own reports" on public.reports
for insert to authenticated with check (auth.uid() = reporter_id);

-- Financial records and seller account IDs are not exposed for direct client writes.
-- Add narrowly scoped server/admin policies only after the server-side authorization design is implemented.
-- Do not add broad public policies to payments, seller_accounts, or admin_inventory.

-- Create a private Storage bucket named "product-images" in the Supabase dashboard.
-- Add Storage policies that allow authenticated sellers to upload to a folder named with their user UUID,
-- and allow public reads only for published product images. Implement ownership checks before launch.
