// src/hooks/useGroupData.js
import { useState, useEffect } from 'react';
import { getGroupDetails, getExpenses, getGroups } from '../services/api';
import { getCategoryOverrides } from '../utils/categoryOverrides';
import { useToast } from '../components/ui/Toast';

export function useGroupData(groupId, userEmail) {
  const toast = useToast();

  const [group,            setGroup]            = useState(null);
  const [members,          setMembers]          = useState([]);
  const [allExpenses,      setAllExpenses]      = useState([]);
  const [memberGroupsMap,  setMemberGroupsMap]  = useState({});
  const [loading,          setLoading]          = useState(true);
  const [categoryOverrides, setCategoryOverrides] = useState(getCategoryOverrides);

  // Refresca overrides cuando la pestaña vuelve a ser visible
  useEffect(() => {
    const onFocus = () => setCategoryOverrides(getCategoryOverrides());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const reload = async () => {
    setLoading(true);
    try {
      const [detailRes, expenseRes] = await Promise.all([
        getGroupDetails(groupId),
        getExpenses(groupId),
      ]);
      setGroup(detailRes.group);
      setMembers(detailRes.members || []);
      setAllExpenses(expenseRes.expenses || []);

      // Otros grupos de cada miembro (para los badges en Miembros)
      try {
        const groupsRes     = await getGroups(userEmail);
        const allUserGroups = groupsRes?.groups || [];
        const otherGroups   = allUserGroups.filter((g) => g.group_id !== groupId);
        const detailsArr    = await Promise.all(
          otherGroups.map((g) => getGroupDetails(g.group_id).catch(() => null))
        );
        const map = {};
        detailsArr.forEach((detail, i) => {
          if (!detail) return;
          const gName = otherGroups[i].name;
          (detail.members || []).forEach((m) => {
            const email = m.user_email || m.email;
            if (!map[email]) map[email] = [];
            map[email].push(gName);
          });
        });
        setMemberGroupsMap(map);
      } catch { /* silencioso */ }

    } catch {
      toast('Error cargando el grupo', 'error');
    } finally {
      setLoading(false);
      setCategoryOverrides(getCategoryOverrides());
    }
  };

  useEffect(() => { reload(); }, [groupId]);

  return { group, members, allExpenses, memberGroupsMap, loading, categoryOverrides, setCategoryOverrides, reload };
}
