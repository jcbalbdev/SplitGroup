// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const session = data?.session;
        if (session?.user) {
          // Buscar perfil para obtener el nombre
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('auth_id', session.user.id)
            .maybeSingle(); // maybeSingle en vez de single (no lanza error si no existe)

          if (mounted) {
            setUser({
              email: session.user.email,
              name: profile?.name || session.user.email.split('@')[0],
            });
          }
        }
      } catch (err) {
        console.error('Error al cargar sesión:', err.message);
        // No bloquear la app aunque falle — simplemente no hay sesión
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSession();

    // Escuchar cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        if (event === 'SIGNED_OUT') {
          setUser(null);
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
                name: profile?.name || session.user.email.split('@')[0],
              });
            }
          } catch (err) {
            console.error('onAuthStateChange error:', err.message);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback((userData) => {
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
