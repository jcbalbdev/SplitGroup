// src/hooks/useGroupData.js
// Stale-while-revalidate: muestra caché al instante, refresca en background sin spinner
import { useState, useEffect, useRef } from 'react';
import { getGroupDetails, getExpenses, getGroups, getExpenseSettlements, getBudgets, getRecurringExpenses, executeRecurringExpense } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { getCached, setCached } from '../utils/cache';
import { useNicknames } from '../context/NicknamesContext';

function buildNicksMap(members) {
  const map = {};
  (members || []).forEach((m) => { if (m.nickname) map[m.user_email] = m.nickname; });
  return map;
}

// Wrapper: timeout de seguridad para cualquier promise (15s por defecto)
function withTimeout(promise, ms = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
  ]);
}

export function useGroupData(groupId, userEmail) {
  const toast       = useToast();
  const { mergeNicknames } = useNicknames();
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
  const [budgets,         setBudgets]         = useState(seed?.budgets || []);
  const [recurring,       setRecurring]       = useState(seed?.recurring || []);

  const reloadSettlements = async () => {
    try {
      const res = await withTimeout(getExpenseSettlements(groupId));
      const fresh = res.settlements || {};
      setSettlements(fresh);
      return fresh;   // ← retorna para que el caller pueda guardar en caché
    } catch { return {}; }
  };

  // Fetch principal (silencioso si ya hay caché)
  const reload = async (opts = {}) => {
    // Guard contra doble fetch, pero con timeout de seguridad
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    // Safety: forzar reset del guard después de 20s por si algo cuelga
    const safetyTimer = setTimeout(() => {
      fetchingRef.current = false;
    }, 20000);

    const showSpinner = opts.showSpinner ?? false;
    if (showSpinner) setLoading(true);

    try {
      const [detailRes, expenseRes, budgetRes, recurringRes] = await withTimeout(
        Promise.all([
          getGroupDetails(groupId),
          getExpenses(groupId),
          getBudgets(groupId).catch(() => ({ budgets: [] })),
          getRecurringExpenses(groupId).catch(() => ({ recurring: [] })),
        ]),
        15000
      );

      const membersData  = detailRes.members || [];
      const nicksMap     = buildNicksMap(membersData);
      const expenses     = expenseRes.expenses || [];
      const freshBudgets   = budgetRes.budgets || [];
      const freshRecurring  = recurringRes.recurring || [];

      setGroup(detailRes.group);
      setMembers(membersData);
      setAllExpenses(expenses);
      setDbNicknames(nicksMap);
      setBudgets(freshBudgets);
      setRecurring(freshRecurring);

      // ── Auto-ejecutar gastos recurrentes vencidos (catch-up completo) ──
      const today = new Date().toISOString().split('T')[0];
      const overdue = freshRecurring.filter(r => r.is_active && r.next_due_date <= today);
      if (overdue.length > 0) {
        (async () => {
          let totalExecuted = 0;
          for (const rec of overdue) {
            // Bucle: avanza período a período hasta ponerse al día
            let currentDueDate = rec.next_due_date;
            let currentRec = { ...rec };
            while (currentDueDate <= today) {
              try {
                const result = await executeRecurringExpense(currentRec, currentDueDate);
                totalExecuted++;
                // Avanzar al siguiente período localmente para la próxima iteración
                currentDueDate = result.nextDate;
                currentRec = { ...currentRec, next_due_date: currentDueDate };
              } catch {
                break; // Si falla un período, salir del bucle para este recurrente
              }
            }
          }
          if (totalExecuted > 0) {
            toast(`${totalExecuted} gasto${totalExecuted > 1 ? 's' : ''} recurrente${totalExecuted > 1 ? 's' : ''} registrado${totalExecuted > 1 ? 's' : ''} automáticamente ✅`);
            const [expRes, recRes] = await Promise.all([
              getExpenses(groupId).catch(() => ({ expenses: [] })),
              getRecurringExpenses(groupId).catch(() => ({ recurring: [] })),
            ]);
            setAllExpenses(expRes.expenses || []);
            setRecurring(recRes.recurring || []);
          }
        })();
      }

      // Sincronizar apodos al contexto global
      mergeNicknames(nicksMap);

      // Settlements — fetch en paralelo (no bloquea UI)
      let freshSettlements = settlements;
      try {
        const settRes = await withTimeout(getExpenseSettlements(groupId));
        freshSettlements = settRes.settlements || {};
        setSettlements(freshSettlements);
      } catch { /* silencioso */ }

      // Badges grupos en común (no bloquea tampoco)
      let groupsMap = {};
      try {
        const groupsRes   = await withTimeout(getGroups(userEmail));
        const allGroups   = groupsRes?.groups || [];
        const otherGroups = allGroups.filter((g) => g.group_id !== groupId);
        const detailsArr  = await withTimeout(
          Promise.all(otherGroups.map((g) => getGroupDetails(g.group_id).catch(() => null)))
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

      // Guardar en caché con datos frescos
      setCached(cacheKey, {
        group: detailRes.group,
        members: membersData,
        expenses,
        nicknames: nicksMap,
        groupsMap,
        settlements: freshSettlements,
        budgets: freshBudgets,
        recurring: freshRecurring,
      });

    } catch {
      if (showSpinner) toast('Error cargando el grupo', 'error');
    } finally {
      clearTimeout(safetyTimer);
      fetchingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    const hasSeed = !!getCached(cacheKey)?.data;
    // Con caché: sin spinner. Sin caché: con spinner.
    reload({ showSpinner: !hasSeed });
  }, [groupId]);

  const reloadBudgets = async () => {
    try {
      const res = await withTimeout(getBudgets(groupId));
      setBudgets(res.budgets || []);
    } catch { /* silencioso */ }
  };

  const reloadRecurring = async () => {
    try {
      const res = await withTimeout(getRecurringExpenses(groupId));
      setRecurring(res.recurring || []);
    } catch { /* silencioso */ }
  };

  return {
    group, members, allExpenses, memberGroupsMap,
    dbNicknames, setDbNicknames,
    loading, settlements, reloadSettlements,
    budgets, reloadBudgets,
    recurring, reloadRecurring,
    reload: () => reload({ showSpinner: false }),
  };
}
