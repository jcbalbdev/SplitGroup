// src/hooks/useGroupData.js
// Stale-while-revalidate: muestra caché al instante, refresca en background sin spinner
import { useState, useEffect, useRef } from 'react';
import { getGroupDetails, getExpenses, getGroups, getExpenseSettlements } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { getCached, setCached } from '../utils/cache';

function buildNicksMap(members) {
  const map = {};
  (members || []).forEach((m) => { if (m.nickname) map[m.user_email] = m.nickname; });
  return map;
}

export function useGroupData(groupId, userEmail) {
  const toast       = useToast();
  const fetchingRef = useRef(false); // evitar doble fetch simultáneo

  // ── Estado inicial desde caché (muestra al instante si existe) ──
  const cacheKey = `group_${groupId}`;
  const cached   = getCached(cacheKey);
  const seed     = cached?.data;

  const [group,           setGroup]          = useState(seed?.group       || null);
  const [members,         setMembers]         = useState(seed?.members     || []);
  const [allExpenses,     setAllExpenses]     = useState(seed?.expenses    || []);
  const [memberGroupsMap, setMemberGroupsMap] = useState(seed?.groupsMap  || {});
  const [dbNicknames,     setDbNicknames]     = useState(seed?.nicknames  || {});
  const [loading,         setLoading]         = useState(!seed);          // spinner solo sin caché
  const [settlements,     setSettlements]     = useState(seed?.settlements || {});

  const reloadSettlements = async () => {
    try {
      const res = await getExpenseSettlements(groupId);
      setSettlements(res.settlements || {});
    } catch { /* silencioso */ }
  };

  // Fetch principal (silencioso si ya hay caché)
  const reload = async (opts = {}) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    const showSpinner = opts.showSpinner ?? false;
    if (showSpinner) setLoading(true);

    try {
      const [detailRes, expenseRes] = await Promise.all([
        getGroupDetails(groupId),
        getExpenses(groupId),
      ]);

      const membersData = detailRes.members || [];
      const nicksMap    = buildNicksMap(membersData);
      const expenses    = expenseRes.expenses || [];

      setGroup(detailRes.group);
      setMembers(membersData);
      setAllExpenses(expenses);
      setDbNicknames(nicksMap);

      // Settlements en background
      getExpenseSettlements(groupId)
        .then((res) => setSettlements(res.settlements || {}))
        .catch(() => {});

      // Badges grupos en común
      let groupsMap = {};
      try {
        const groupsRes   = await getGroups(userEmail);
        const allGroups   = groupsRes?.groups || [];
        const otherGroups = allGroups.filter((g) => g.group_id !== groupId);
        const detailsArr  = await Promise.all(
          otherGroups.map((g) => getGroupDetails(g.group_id).catch(() => null))
        );
        detailsArr.forEach((detail, i) => {
          if (!detail) return;
          const gName = otherGroups[i].name;
          (detail.members || []).forEach((m) => {
            const email = m.user_email;
            if (!groupsMap[email]) groupsMap[email] = [];
            groupsMap[email].push(gName);
          });
        });
        setMemberGroupsMap(groupsMap);
      } catch { /* silencioso */ }

      // Guardar en caché para próxima visita
      setCached(cacheKey, {
        group: detailRes.group,
        members: membersData,
        expenses,
        nicknames: nicksMap,
        groupsMap,
      });

    } catch {
      if (showSpinner) toast('Error cargando el grupo', 'error');
    } finally {
      fetchingRef.current = false;
      if (showSpinner) setLoading(false);
      else setLoading(false); // siempre quitar spinner
    }
  };

  useEffect(() => {
    const hasSeed = !!getCached(cacheKey)?.data;
    // Con caché: sin spinner. Sin caché: con spinner.
    reload({ showSpinner: !hasSeed });
  }, [groupId]);

  return {
    group, members, allExpenses, memberGroupsMap,
    dbNicknames, setDbNicknames,
    loading, settlements, reloadSettlements,
    reload: () => reload({ showSpinner: false }),
  };
}
