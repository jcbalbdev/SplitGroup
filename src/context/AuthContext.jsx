// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Al cargar la app: restaurar sesión guardada
  useEffect(() => {
    const saved = localStorage.getItem('splitgroup_user');
    if (saved) {
      try { setUser(JSON.parse(saved)); }
      catch { localStorage.removeItem('splitgroup_user'); }
    }
    setLoading(false);
  }, []);

  /** Llamar tras verificar el OTP correctamente */
  const login = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('splitgroup_user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('splitgroup_user');
    localStorage.removeItem('splitgroup_token');
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
