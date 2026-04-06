// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { verifyToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verificar token al cargar la app
  useEffect(() => {
    const initAuth = async () => {
      // 1. Verificar si hay token en la URL (callback del magic link)
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');

      if (urlToken) {
        try {
          const result = await verifyToken(urlToken);
          if (result.success) {
            const userData = { email: result.email, name: result.name };
            setUser(userData);
            localStorage.setItem('splitgroup_user', JSON.stringify(userData));
            localStorage.setItem('splitgroup_token', urlToken);
            // Limpiar token de la URL
            window.history.replaceState({}, '', window.location.pathname);
          }
        } catch (err) {
          console.error('Token inválido:', err);
        }
      } else {
        // 2. Verificar si hay sesión guardada en localStorage
        const saved = localStorage.getItem('splitgroup_user');
        if (saved) {
          try {
            setUser(JSON.parse(saved));
          } catch {
            localStorage.removeItem('splitgroup_user');
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('splitgroup_user');
    localStorage.removeItem('splitgroup_token');
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
