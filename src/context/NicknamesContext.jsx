// src/context/NicknamesContext.jsx
// Contexto global de apodos. La fuente de verdad es la DB (Supabase).
// Se actualiza cuando useGroupData carga miembros y cuando se edita un apodo.
import { createContext, useContext, useState, useCallback } from 'react';

const NicknamesContext = createContext({});

export function NicknamesProvider({ children }) {
  const [nicknames, setNicknames] = useState({});

  // Merge new nicknames into existing map (for multi-group support)
  const mergeNicknames = useCallback((nicksMap) => {
    setNicknames(prev => ({ ...prev, ...nicksMap }));
  }, []);

  // Set a single nickname
  const setOneNickname = useCallback((email, nick) => {
    setNicknames(prev => {
      const next = { ...prev };
      if (nick?.trim()) {
        next[email] = nick.trim();
      } else {
        delete next[email];
      }
      return next;
    });
  }, []);

  // Display name: nickname or email prefix
  const dn = useCallback((email) => {
    if (!email) return '';
    return nicknames[email] || email.split('@')[0];
  }, [nicknames]);

  return (
    <NicknamesContext.Provider value={{ nicknames, mergeNicknames, setOneNickname, dn }}>
      {children}
    </NicknamesContext.Provider>
  );
}

export function useNicknames() {
  return useContext(NicknamesContext);
}
