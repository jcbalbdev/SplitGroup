-- ═══════════════════════════════════════════════════════════════
-- Módulo de Presupuestos — SplitGroup
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Tabla budgets
-- ─────────────────────────────────────────────────────────────
create table if not exists budgets (
  budget_id   uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups(group_id) on delete cascade,
  name        text not null,
  target_date date,
  created_by  text not null,
  status      text not null default 'active'
    check (status in ('active', 'completed', 'cancelled')),
  created_at  timestamptz not null default now()
);

-- 2. Tabla budget_items
-- ─────────────────────────────────────────────────────────────
create table if not exists budget_items (
  item_id     uuid primary key default gen_random_uuid(),
  budget_id   uuid not null references budgets(budget_id) on delete cascade,
  description text not null,
  amount      numeric(12,2) not null check (amount > 0),
  paid_by     text not null,
  category    text not null default 'otros',
  status      text not null default 'pending'
    check (status in ('pending', 'executed', 'cancelled')),
  expense_id  uuid references expenses(expense_id) on delete set null,
  created_at  timestamptz not null default now()
);

-- 3. Tabla budget_item_participants
-- ─────────────────────────────────────────────────────────────
create table if not exists budget_item_participants (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references budget_items(item_id) on delete cascade,
  user_email   text not null,
  share_amount numeric(12,2) not null
);

-- ═══════════════════════════════════════════════════════════════
-- Índices para performance
-- ═══════════════════════════════════════════════════════════════
create index if not exists idx_budgets_group_id     on budgets(group_id);
create index if not exists idx_budget_items_budget  on budget_items(budget_id);
create index if not exists idx_bip_item_id          on budget_item_participants(item_id);

-- ═══════════════════════════════════════════════════════════════
-- RLS (Row Level Security)
-- ═══════════════════════════════════════════════════════════════

alter table budgets                  enable row level security;
alter table budget_items             enable row level security;
alter table budget_item_participants enable row level security;

-- Eliminar políticas existentes (por si ya existen de un intento anterior)
drop policy if exists "budgets_group_members"    on budgets;
drop policy if exists "budget_items_group_members" on budget_items;
drop policy if exists "bip_group_members"        on budget_item_participants;

-- budgets: solo miembros del grupo
create policy "budgets_group_members" on budgets
  for all using (
    exists (
      select 1 from group_members gm
      where gm.group_id = budgets.group_id
        and gm.user_email = auth.jwt() ->> 'email'
    )
  );

-- budget_items: heredar acceso desde budgets
create policy "budget_items_group_members" on budget_items
  for all using (
    exists (
      select 1 from budgets b
      join group_members gm on gm.group_id = b.group_id
      where b.budget_id = budget_items.budget_id
        and gm.user_email = auth.jwt() ->> 'email'
    )
  );

-- budget_item_participants: heredar acceso desde budget_items
create policy "bip_group_members" on budget_item_participants
  for all using (
    exists (
      select 1 from budget_items bi
      join budgets b on b.budget_id = bi.budget_id
      join group_members gm on gm.group_id = b.group_id
      where bi.item_id = budget_item_participants.item_id
        and gm.user_email = auth.jwt() ->> 'email'
    )
  );
