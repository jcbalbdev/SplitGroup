-- Añadir columna nickname a group_members (para apodos compartidos por grupo)
ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS nickname TEXT;
