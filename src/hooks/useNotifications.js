// src/hooks/useNotifications.js
import { useState, useEffect, useCallback } from 'react';
import { getNotifications } from '../services/api/notifications';

export function useNotifications(userEmail) {
  const [activity,    setActivity]    = useState([]);
  const [myRecurring, setMyRecurring] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [loaded,      setLoaded]      = useState(false);

  const fetch = useCallback(async () => {
    if (!userEmail) return;
    setLoading(true);
    try {
      const { activity: a, myRecurring: r } = await getNotifications(userEmail);
      setActivity(a);
      setMyRecurring(r);
      setLoaded(true);
    } catch {
      // silencioso — no bloquea la UI
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  // Cargar solo cuando se abra el panel (lazy)
  return { activity, myRecurring, loading, loaded, fetch };
}
