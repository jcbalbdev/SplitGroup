// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Al cargar la app: restaurar sesión de Supabase
  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Buscar perfil para obtener el nombre
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('auth_id', session.user.id)
          .single();
          
        if (mounted) {
          setUser({ 
            email: session.user.email, 
            name: profile?.name || session.user.email.split('@')[0] 
          });
        }
      }
      if (mounted) setLoading(false);
    }

    loadSession();

    // Escuchar cambios de sesión (ej. si se desloguea desde otra pestaña)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
        } else if (event === 'SIGNED_IN' && session) {
           const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('auth_id', session.user.id)
            .single();
          
          setUser({ 
            email: session.user.email, 
            name: profile?.name || session.user.email.split('@')[0] 
          });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /** Llamado tras un login manual para sincronizar el estado sin esperar a Supabase */
  const login = useCallback((userData) => {
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setLoading(false);
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
