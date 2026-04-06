// src/services/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Faltan variables de entorno de Supabase. Añade VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY a tu archivo .env');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
