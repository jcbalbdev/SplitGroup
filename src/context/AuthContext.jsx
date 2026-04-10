// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import OneSignal from 'react-onesignal';

const AuthContext = createContext(null);

// Limpia SOLO tokens verdaderamente inválidos (error "Refresh Token Not Found")
const clearStaleTokens = () => {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
      .forEach((k) => localStorage.removeItem(k));
  } catch (_) {}
};

// getSession con timeout — si tarda, devuelve null sin borrar el token
// El refresh en background seguirá y onAuthStateChange auto-actualizará
const getSessionSafe = (ms = 8000) =>
  Promise.race([
    supabase.auth.getSession(),
    new Promise((resolve) =>
      setTimeout(() => resolve({ data: { session: null }, error: null, _timedOut: true }), ms)
    ),
  ]);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const result = await getSessionSafe(8000);

        // Timeout → no borrar token, solo continuar como no autenticado
        // El onAuthStateChange disparará cuando el refresh complete en background
        if (result._timedOut) {
          console.warn('getSession tardó >8s, esperando onAuthStateChange...');
          return;
        }

        const { data, error } = result;

        if (error) {
          // "Invalid Refresh Token" → token realmente inválido → limpiar
          if (error.message?.includes('Refresh Token')) {
            clearStaleTokens();
            try { await supabase.auth.signOut(); } catch (_) {}
          }
          return;
        }

        const session = data?.session;
        if (session?.user && mounted) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('auth_id', session.user.id)
            .maybeSingle();

          if (mounted) {
            setUser({
              email: session.user.email,
              name:  profile?.name || session.user.email.split('@')[0],
            });
            // Asociar dispositivo en OneSignal al cargar sesión existente
            try {
              await OneSignal.login(session.user.email);
              if (Notification.permission === 'granted') {
                await OneSignal.User.PushSubscription.optIn();
              }
            } catch (_) {}
          }
        }
      } catch (err) {
        console.error('loadSession error:', err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSession();

    // onAuthStateChange: maneja refresh tardío y nuevos logins
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
        } else if (event === 'PASSWORD_RECOVERY') {
          // User clicked the reset password link from email
          setPasswordRecovery(true);
          setLoading(false);
        } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('name')
              .eq('auth_id', session.user.id)
              .maybeSingle();

            if (mounted) {
              setUser({
                email: session.user.email,
                name:  profile?.name || session.user.email.split('@')[0],
              });
              setLoading(false); // quitar spinner si estaba tardando
            }
          } catch (err) {
            console.error('onAuthStateChange error:', err.message);
            if (mounted) setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login  = useCallback((userData) => {
    setUser(userData);
    // Asociar dispositivo con usuario en OneSignal
    try {
      OneSignal.login(userData.email);
      if (Notification.permission === 'granted') {
        OneSignal.User.PushSubscription.optIn();
      }
    } catch (_) {}
  }, []);
  const logout = useCallback(async () => {
    try { await OneSignal.logout(); } catch (_) {}
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser, passwordRecovery, setPasswordRecovery }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
