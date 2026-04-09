// src/services/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Faltan variables de entorno de Supabase.');
}

// Limpiar tokens expirados ANTES de crear el cliente
// Evita que el SDK intente refreshear un token caducado (tarda 15-30s en free tier)
try {
  Object.keys(localStorage)
    .filter((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
    .forEach((k) => {
      try {
        const parsed = JSON.parse(localStorage.getItem(k));
        const expiresAt = parsed?.expires_at;
        if (expiresAt && Math.floor(Date.now() / 1000) >= expiresAt) {
          localStorage.removeItem(k);
        }
      } catch (_) {}
    });
} catch (_) {}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
    flowType:           'implicit',
    // No-op lock: evita deadlocks de navigator.locks durante HMR en desarrollo
    lock: async (_name, _acquireTimeout, fn) => await fn(),
  },
});
