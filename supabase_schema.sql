-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Perfiles (Usa email como clave principal para permitir invitaciones a usuarios no registrados)
CREATE TABLE public.profiles (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  auth_id UUID UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: Cuando alguien se registra en Supabase Auth, crear o enlazar su perfil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (email, name, auth_id)
  VALUES (NEW.email, split_part(NEW.email, '@', 1), NEW.id)
  ON CONFLICT (email) DO UPDATE SET auth_id = EXCLUDED.auth_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Grupos
CREATE TABLE public.groups (
  group_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by TEXT REFERENCES public.profiles(email) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Miembros del Grupo
CREATE TABLE public.group_members (
  group_id UUID REFERENCES public.groups(group_id) ON DELETE CASCADE,
  user_email TEXT REFERENCES public.profiles(email) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_email)
);

-- 4. Gastos
CREATE TABLE public.expenses (
  expense_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(group_id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  paid_by TEXT REFERENCES public.profiles(email) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'otros',
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Participantes del Gasto (División)
CREATE TABLE public.expense_participants (
  expense_id UUID REFERENCES public.expenses(expense_id) ON DELETE CASCADE,
  user_email TEXT REFERENCES public.profiles(email) ON DELETE CASCADE,
  share_amount NUMERIC(12, 2) NOT NULL,
  PRIMARY KEY (expense_id, user_email)
);

-- 6. Liquidaciones por Gasto (Checkbox "Pagado")
CREATE TABLE public.expense_settlements (
  expense_id UUID REFERENCES public.expenses(expense_id) ON DELETE CASCADE PRIMARY KEY,
  group_id UUID REFERENCES public.groups(group_id) ON DELETE CASCADE,
  settled_by TEXT REFERENCES public.profiles(email) ON DELETE SET NULL,
  settled_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Liquidaciones Globales (Saldar Deudas)
CREATE TABLE public.settlements (
  settlement_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(group_id) ON DELETE CASCADE,
  from_user TEXT REFERENCES public.profiles(email) ON DELETE CASCADE,
  to_user TEXT REFERENCES public.profiles(email) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  settled_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS temporalmente abierto para la API (luego se puede asegurar más)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON public.profiles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON public.groups FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON public.group_members FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON public.expenses FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON public.expense_participants FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON public.expense_settlements FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON public.settlements FOR ALL USING (auth.role() = 'authenticated');
