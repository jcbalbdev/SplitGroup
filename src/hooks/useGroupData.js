// src/hooks/useGroupData.js
import { useState, useEffect } from 'react';
import { getGroupDetails, getExpenses, getGroups, getExpenseSettlements } from '../services/api';
import { useToast } from '../components/ui/Toast';

export function useGroupData(groupId, userEmail) {
  const toast = useToast();

  const [group,           setGroup]          = useState(null);
  const [members,         setMembers]         = useState([]);
  const [allExpenses,     setAllExpenses]     = useState([]);
  const [memberGroupsMap, setMemberGroupsMap] = useState({});
  // Mapa email → apodo cargado de la BD
  const [dbNicknames,     setDbNicknames]     = useState({});
  const [loading,         setLoading]         = useState(true);
  const [settlements,     setSettlements]     = useState({});

  const reloadSettlements = async () => {
    try {
      const res = await getExpenseSettlements(groupId);
      setSettlements(res.settlements || {});
    } catch { /* silencioso */ }
  };

  const reload = async () => {
    setLoading(true);
    try {
      const [detailRes, expenseRes] = await Promise.all([
        getGroupDetails(groupId),
        getExpenses(groupId),
      ]);

      const membersData = detailRes.members || [];
      setGroup(detailRes.group);
      setMembers(membersData);
      setAllExpenses(expenseRes.expenses || []);

      // Construir mapa de apodos desde la BD
      const nicksMap = {};
      membersData.forEach((m) => {
        if (m.nickname) nicksMap[m.user_email] = m.nickname;
      });
      setDbNicknames(nicksMap);

      // Settlements: no bloquea
      getExpenseSettlements(groupId)
        .then((res) => setSettlements(res.settlements || {}))
        .catch(() => { /* silencioso */ });

      // Otros grupos de cada miembro (badges en Miembros)
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
    }
  };

  useEffect(() => { reload(); }, [groupId]);

  return {
    group, members, allExpenses, memberGroupsMap,
    dbNicknames, setDbNicknames,
    loading, settlements, reloadSettlements,
    reload,
  };
}
