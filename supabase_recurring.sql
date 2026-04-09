-- ═══════════════════════════════════════════════════════════════
-- Módulo de Gastos Recurrentes — SplitGroup
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Tabla recurring_expenses (plantillas de gastos recurrentes)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  recurring_id   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id       UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
  amount         NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description    TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT 'otros',
  paid_by        TEXT NOT NULL REFERENCES profiles(email) ON DELETE CASCADE,
  frequency      TEXT NOT NULL DEFAULT 'monthly'
                   CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  start_date     DATE NOT NULL,
  next_due_date  DATE NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_by     TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabla recurring_expense_participants
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recurring_expense_participants (
  recurring_id UUID NOT NULL REFERENCES recurring_expenses(recurring_id) ON DELETE CASCADE,
  user_email   TEXT NOT NULL REFERENCES profiles(email) ON DELETE CASCADE,
  share_amount NUMERIC(12, 2) NOT NULL,
  PRIMARY KEY (recurring_id, user_email)
);

-- 3. Columna recurring_id en expenses (referencia opcional hacia la plantilla)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS recurring_id UUID
    REFERENCES public.recurring_expenses(recurring_id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════════
-- Índices
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_recurring_group_id      ON recurring_expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_recurring_participants  ON recurring_expense_participants(recurring_id);
CREATE INDEX IF NOT EXISTS idx_expenses_recurring_id   ON expenses(recurring_id);

-- ═══════════════════════════════════════════════════════════════
-- RLS (Row Level Security)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE recurring_expenses                ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expense_participants    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recurring_group_members" ON recurring_expenses;
DROP POLICY IF EXISTS "recurring_participants_group_members" ON recurring_expense_participants;

-- recurring_expenses: solo miembros del grupo
CREATE POLICY "recurring_group_members" ON recurring_expenses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = recurring_expenses.group_id
        AND gm.user_email = auth.jwt() ->> 'email'
    )
  );

-- recurring_expense_participants: heredar acceso
CREATE POLICY "recurring_participants_group_members" ON recurring_expense_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM recurring_expenses re
      JOIN group_members gm ON gm.group_id = re.group_id
      WHERE re.recurring_id = recurring_expense_participants.recurring_id
        AND gm.user_email = auth.jwt() ->> 'email'
    )
  );
