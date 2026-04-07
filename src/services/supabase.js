// src/services/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Faltan variables de entorno de Supabase.');
}

/**
 * Custom storage: si el access_token está expirado, lo desechamos antes
 * de que Supabase intente refrescarlo (la llamada de refresh en free tier
 * puede tardar 15-30 s). Así el login es siempre rápido.
 * El access_token dura 1 hora; cuando expira el usuario hace login fresco
 * que es instantáneo.
 */
const smartStorage = {
  getItem(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      // Solo interceptamos el token de sesión de Supabase
      if (key.includes('-auth-token')) {
        const parsed = JSON.parse(raw);
        const expiresAt = parsed?.expires_at; // Unix timestamp en segundos
        if (expiresAt && Math.floor(Date.now() / 1000) >= expiresAt) {
          // Token expirado → borrar y tratar como sin sesión (login rápido)
          localStorage.removeItem(key);
          return null;
        }
      }

      return raw;
    } catch {
      return localStorage.getItem(key);
    }
  },
  setItem(key, value) {
    try { localStorage.setItem(key, value); } catch (_) {}
  },
  removeItem(key) {
    try { localStorage.removeItem(key); } catch (_) {}
  },
};

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    storage:          smartStorage,
    persistSession:   true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
