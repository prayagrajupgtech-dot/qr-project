-- Supabase Database Schema for QR and ID Card Generator (Admin + User Architecture)

-- 1. Plans Table
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10, 2) not null default 0,
  currency text not null default 'INR',
  duration_days integer not null default 30,
  card_limit integer not null default 100, -- -1 for unlimited
  features text[] default '{}',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plans enable row level security;
revoke all on public.plans from anon, authenticated;
grant select, insert, update, delete on public.plans to service_role;

-- Default Plans Seed (insert if not exists)
insert into public.plans (id, name, price, duration_days, card_limit, status)
values
  ('11111111-1111-1111-1111-111111111111', 'Basic', 499.00, 30, 100, 'active'),
  ('22222222-2222-2222-2222-222222222222', 'Standard', 999.00, 90, 300, 'active'),
  ('33333333-3333-3333-3333-333333333333', 'Premium', 1999.00, 365, -1, 'active')
on conflict (id) do nothing;

-- 2. User Profiles Table
create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  display_name text,
  phone text,
  country text default 'India',
  country_code text default '+91',
  password_hash text,
  password_configured boolean not null default true,
  role text not null default 'user' check (role in ('admin', 'user')),
  status text not null default 'active' check (status in ('active', 'blocked', 'deleted')),
  plan_id uuid references public.plans(id) on delete set null,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_profiles_email_idx on public.user_profiles(email);
create index if not exists user_profiles_role_idx on public.user_profiles(role);

alter table public.user_profiles enable row level security;
revoke all on public.user_profiles from anon, authenticated;
grant select, insert, update, delete on public.user_profiles to service_role;

-- 3. Card Applications Table
create table if not exists public.card_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.user_profiles(id) on delete cascade not null,
  plan_id uuid references public.plans(id) on delete set null,
  full_name text not null default '',
  phone text not null default '',
  parent_phone text,
  country text default 'India',
  country_code text default '+91',
  date_of_birth date,
  address text default '',
  email text default '',
  photo_url text,
  completion_percentage integer not null default 0,
  status text not null default 'draft' check (status in (
    'draft', 'incomplete', 'completed', 'submitted',
    'payment_pending', 'payment_success', 'payment_failed',
    'card_issued', 'card_active', 'card_suspended', 'cancelled'
  )),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists card_applications_user_idx on public.card_applications(user_id);
create index if not exists card_applications_status_idx on public.card_applications(status);

-- Supports existing installations that already created card_applications.
alter table public.card_applications add column if not exists parent_phone text;

alter table public.id_cards add column if not exists parent_phone text;

alter table public.card_applications enable row level security;
revoke all on public.card_applications from anon, authenticated;
grant select, insert, update, delete on public.card_applications to service_role;

-- 4. Payments Table
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.user_profiles(id) on delete set null,
  application_id uuid references public.card_applications(id) on delete set null,
  plan_id uuid references public.plans(id) on delete set null,
  order_id text,
  transaction_id text,
  amount numeric(10, 2) not null default 0,
  currency text not null default 'INR',
  status text not null default 'created' check (status in (
    'created', 'pending', 'success', 'failed', 'cancelled', 'refunded'
  )),
  gateway text default 'razorpay',
  gateway_response jsonb,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_user_idx on public.payments(user_id);
create index if not exists payments_application_idx on public.payments(application_id);
create index if not exists payments_order_idx on public.payments(order_id);

alter table public.payments enable row level security;
revoke all on public.payments from anon, authenticated;
grant select, insert, update, delete on public.payments to service_role;

-- 5. ID Cards Table (linked to applications)
create table if not exists public.id_cards (
  id uuid primary key default gen_random_uuid(),
  card_number text unique not null,
  name text not null,
  phone text not null,
  date_of_birth date not null,
  edit_token_hash text not null,
  address text not null,
  photo_url text,
  country text default 'India',
  country_code text default '+91',
  user_id uuid references public.user_profiles(id) on delete set null,
  application_id uuid references public.card_applications(id) on delete set null,
  plan_id uuid references public.plans(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  qr_token text unique,
  status text not null default 'active' check (status in ('active', 'expired', 'blocked')),
  issued_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists id_cards_card_number_idx on public.id_cards(card_number);
create index if not exists id_cards_user_id_idx on public.id_cards(user_id);
create index if not exists id_cards_application_idx on public.id_cards(application_id);

alter table public.id_cards enable row level security;
revoke all on public.id_cards from anon, authenticated;
grant select, insert, update, delete on public.id_cards to service_role;

-- 6. Notifications Table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('new_user', 'application_started', 'application_submitted', 'payment_success', 'payment_failed', 'card_issued')),
  title text not null,
  message text not null,
  related_user_id uuid references public.user_profiles(id) on delete set null,
  related_application_id uuid references public.card_applications(id) on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_read_idx on public.notifications(read);
create index if not exists notifications_created_idx on public.notifications(created_at desc);

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select, insert, update, delete on public.notifications to service_role;

-- 7. Admin Activity Logs Table
create table if not exists public.admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  admin_id text not null,
  target_user_id text,
  details text,
  created_at timestamptz not null default now()
);

alter table public.admin_activity_logs enable row level security;
revoke all on public.admin_activity_logs from anon, authenticated;
grant select, insert, update, delete on public.admin_activity_logs to service_role;

-- 8. Subscriptions Table (Razorpay legacy link)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  razorpay_subscription_id text unique not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  user_id uuid references public.user_profiles(id) on delete set null,
  password_hash text,
  status text not null,
  trial_ends_at timestamptz not null,
  current_start_at timestamptz,
  current_end_at timestamptz,
  paid_count integer not null default 0,
  remaining_count integer not null default 60,
  last_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
revoke all on public.subscriptions from anon, authenticated;
grant select, insert, update to service_role;

-- 9. Email Verifications Table (OTP)
create table if not exists public.email_verifications (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  otp_hash text not null,
  expires_at timestamptz not null,
  verified boolean not null default false,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  created_at timestamptz not null default now()
);

alter table public.email_verifications enable row level security;
revoke all on public.email_verifications from anon, authenticated;
grant select, insert, update to service_role;
