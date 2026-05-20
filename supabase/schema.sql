create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  display_name text not null default 'Roblox Workspace',
  paired_plugin_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz,
  studio_user_id bigint,
  studio_username text,
  studio_display_name text,
  studio_authorized_at timestamptz
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default '',
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.system_packs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  files jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint system_packs_files_array check (jsonb_typeof(files) = 'array')
);

alter table public.workspaces
  add column if not exists token_value text unique,
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists description text not null default '',
  add column if not exists model_key text not null default 'openai/gpt-4.1-mini',
  add column if not exists selected_packs jsonb not null default '[]'::jsonb,
  add column if not exists is_archived boolean not null default false,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists billing_status text not null default 'free',
  add column if not exists billing_interval text,
  add column if not exists studio_user_id bigint,
  add column if not exists studio_username text,
  add column if not exists studio_display_name text,
  add column if not exists studio_authorized_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workspaces_billing_status_check'
  ) then
    alter table public.workspaces
      add constraint workspaces_billing_status_check
      check (billing_status in ('free', 'pending', 'trialing', 'active', 'past_due', 'canceled', 'unpaid'));
  end if;
end
$$;

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null default 'Untitled plan',
  prompt text not null,
  model_key text,
  provider_key text,
  requested_model text,
  credit_cost integer not null default 0,
  summary text not null default '',
  explanation text not null default '',
  status text not null default 'queued' check (status in ('queued', 'claimed', 'applied', 'failed')),
  operations jsonb not null default '[]'::jsonb,
  manual_steps jsonb not null default '[]'::jsonb,
  result_log jsonb not null default '[]'::jsonb,
  claimed_by text,
  claimed_at timestamptz,
  applied_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_wallets (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  plan_tier text not null default 'free' check (plan_tier in ('free', 'pro', 'studio')),
  credits_balance integer not null default 100,
  daily_claim_streak integer not null default 0,
  last_daily_claim_date date,
  lifetime_credits_granted integer not null default 100,
  lifetime_credits_spent integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  delta integer not null,
  balance_after integer not null,
  kind text not null check (kind in ('starter', 'daily', 'purchase', 'spend', 'refund', 'bonus', 'plan_change')),
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.billing_orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  stripe_checkout_session_id text unique,
  stripe_customer_id text,
  kind text not null check (kind in ('plan', 'credits')),
  plan_tier text check (plan_tier in ('free', 'pro', 'studio')),
  pack_id text,
  status text not null default 'pending' check (status in ('pending', 'open', 'completed', 'failed', 'expired')),
  amount_cents integer,
  currency text not null default 'usd',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.stripe_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_workspace_created_at
  on public.chat_messages(workspace_id, created_at desc);

create index if not exists idx_workspaces_owner_created_at
  on public.workspaces(owner_user_id, created_at desc)
  where owner_user_id is not null and is_archived = false;

create index if not exists idx_jobs_workspace_created_at
  on public.jobs(workspace_id, created_at desc);

create index if not exists idx_system_packs_owner_updated_at
  on public.system_packs(owner_user_id, updated_at desc);

create index if not exists idx_jobs_workspace_status_created_at
  on public.jobs(workspace_id, status, created_at asc);

create index if not exists idx_credit_ledger_workspace_created_at
  on public.credit_ledger(workspace_id, created_at desc);

create index if not exists idx_billing_orders_workspace_created_at
  on public.billing_orders(workspace_id, created_at desc);

create index if not exists idx_billing_orders_user_created_at
  on public.billing_orders(user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_workspaces_set_updated_at on public.workspaces;
create trigger trg_workspaces_set_updated_at
before update on public.workspaces
for each row
execute function public.set_updated_at();

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_system_packs_set_updated_at on public.system_packs;
create trigger trg_system_packs_set_updated_at
before update on public.system_packs
for each row
execute function public.set_updated_at();

drop trigger if exists trg_jobs_set_updated_at on public.jobs;
create trigger trg_jobs_set_updated_at
before update on public.jobs
for each row
execute function public.set_updated_at();

drop trigger if exists trg_workspace_wallets_set_updated_at on public.workspace_wallets;
create trigger trg_workspace_wallets_set_updated_at
before update on public.workspace_wallets
for each row
execute function public.set_updated_at();

drop trigger if exists trg_billing_orders_set_updated_at on public.billing_orders;
create trigger trg_billing_orders_set_updated_at
before update on public.billing_orders
for each row
execute function public.set_updated_at();

create or replace function public.claim_next_job(
  p_workspace_id uuid,
  p_plugin_name text
)
returns public.jobs
language plpgsql
security definer
as $$
declare
  claimed public.jobs;
begin
  update public.jobs
     set status = 'claimed',
         claimed_by = coalesce(nullif(trim(p_plugin_name), ''), claimed_by),
         claimed_at = now(),
         updated_at = now()
   where id = (
     select id
       from public.jobs
      where workspace_id = p_workspace_id
        and status = 'queued'
      order by created_at asc
      limit 1
      for update skip locked
   )
   returning * into claimed;

  return claimed;
end;
$$;

create or replace function public.complete_job(
  p_job_id uuid,
  p_workspace_id uuid,
  p_status text,
  p_result_log jsonb default '[]'::jsonb,
  p_last_error text default null,
  p_plugin_name text default null
)
returns public.jobs
language plpgsql
security definer
as $$
declare
  updated_job public.jobs;
begin
  update public.jobs
     set status = p_status,
         result_log = coalesce(p_result_log, '[]'::jsonb),
         last_error = nullif(p_last_error, ''),
         applied_at = case when p_status = 'applied' then now() else applied_at end,
         claimed_by = coalesce(nullif(trim(p_plugin_name), ''), claimed_by),
         updated_at = now()
   where id = p_job_id
     and workspace_id = p_workspace_id
   returning * into updated_job;

  return updated_job;
end;
$$;

create or replace function public.apply_workspace_credit_delta(
  p_workspace_id uuid,
  p_delta integer,
  p_kind text,
  p_summary text,
  p_metadata jsonb default '{}'::jsonb
)
returns public.workspace_wallets
language plpgsql
security definer
as $$
declare
  updated_wallet public.workspace_wallets;
begin
  update public.workspace_wallets
     set credits_balance = credits_balance + p_delta,
         lifetime_credits_granted = lifetime_credits_granted + case when p_delta > 0 then p_delta else 0 end,
         lifetime_credits_spent = lifetime_credits_spent + case when p_delta < 0 then abs(p_delta) else 0 end,
         updated_at = now()
   where workspace_id = p_workspace_id
     and credits_balance + p_delta >= 0
   returning * into updated_wallet;

  if updated_wallet.workspace_id is null then
    raise exception 'Insufficient credits';
  end if;

  insert into public.credit_ledger (
    workspace_id,
    delta,
    balance_after,
    kind,
    summary,
    metadata
  )
  values (
    p_workspace_id,
    p_delta,
    updated_wallet.credits_balance,
    p_kind,
    p_summary,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return updated_wallet;
end;
$$;

alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.system_packs enable row level security;
alter table public.chat_messages enable row level security;
alter table public.jobs enable row level security;
alter table public.workspace_wallets enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.billing_orders enable row level security;
alter table public.stripe_events enable row level security;

drop policy if exists "Profiles read own row" on public.profiles;
create policy "Profiles read own row"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Profiles update own row" on public.profiles;
create policy "Profiles update own row"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "System packs read own rows" on public.system_packs;
create policy "System packs read own rows"
on public.system_packs
for select
to authenticated
using (auth.uid() = owner_user_id);

drop policy if exists "System packs insert own rows" on public.system_packs;
create policy "System packs insert own rows"
on public.system_packs
for insert
to authenticated
with check (auth.uid() = owner_user_id);

drop policy if exists "System packs update own rows" on public.system_packs;
create policy "System packs update own rows"
on public.system_packs
for update
to authenticated
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "System packs delete own rows" on public.system_packs;
create policy "System packs delete own rows"
on public.system_packs
for delete
to authenticated
using (auth.uid() = owner_user_id);

drop policy if exists "Workspaces read own rows" on public.workspaces;
create policy "Workspaces read own rows"
on public.workspaces
for select
to authenticated
using (auth.uid() = owner_user_id);

drop policy if exists "Workspaces insert own rows" on public.workspaces;
create policy "Workspaces insert own rows"
on public.workspaces
for insert
to authenticated
with check (auth.uid() = owner_user_id);

drop policy if exists "Workspaces update own rows" on public.workspaces;
create policy "Workspaces update own rows"
on public.workspaces
for update
to authenticated
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "Workspaces delete own rows" on public.workspaces;
create policy "Workspaces delete own rows"
on public.workspaces
for delete
to authenticated
using (auth.uid() = owner_user_id);

drop policy if exists "Chat messages read own workspace rows" on public.chat_messages;
create policy "Chat messages read own workspace rows"
on public.chat_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.workspaces
    where workspaces.id = chat_messages.workspace_id
      and workspaces.owner_user_id = auth.uid()
  )
);

drop policy if exists "Jobs read own workspace rows" on public.jobs;
create policy "Jobs read own workspace rows"
on public.jobs
for select
to authenticated
using (
  exists (
    select 1
    from public.workspaces
    where workspaces.id = jobs.workspace_id
      and workspaces.owner_user_id = auth.uid()
  )
);

drop policy if exists "Wallets read own workspace rows" on public.workspace_wallets;
create policy "Wallets read own workspace rows"
on public.workspace_wallets
for select
to authenticated
using (
  exists (
    select 1
    from public.workspaces
    where workspaces.id = workspace_wallets.workspace_id
      and workspaces.owner_user_id = auth.uid()
  )
);

drop policy if exists "Ledger read own workspace rows" on public.credit_ledger;
create policy "Ledger read own workspace rows"
on public.credit_ledger
for select
to authenticated
using (
  exists (
    select 1
    from public.workspaces
    where workspaces.id = credit_ledger.workspace_id
      and workspaces.owner_user_id = auth.uid()
  )
);

drop policy if exists "Billing orders read own workspace rows" on public.billing_orders;
create policy "Billing orders read own workspace rows"
on public.billing_orders
for select
to authenticated
using (
  exists (
    select 1
    from public.workspaces
    where workspaces.id = billing_orders.workspace_id
      and workspaces.owner_user_id = auth.uid()
  )
);
