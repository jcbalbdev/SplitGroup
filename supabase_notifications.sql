-- ═══════════════════════════════════════════════════════════════
-- Migración: created_by en expenses y budgets — SplitGroup
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Quién registró el gasto en la app (no necesariamente quien pagó)
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS created_by TEXT
    REFERENCES public.profiles(email) ON DELETE SET NULL;

-- Quién registró el presupuesto
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS created_by TEXT
    REFERENCES public.profiles(email) ON DELETE SET NULL;

-- Índices para la query de notificaciones
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_budgets_created_by  ON budgets(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at DESC);
