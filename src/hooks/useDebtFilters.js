// src/hooks/useDebtFilters.js
import { useState, useMemo } from 'react';
import { DATE_PRESETS, getDateRange } from '../utils/datePresets';
import { computeExpenseDebts } from '../utils/balanceCalculator';
import { markExpensePaid, unmarkExpensePaid } from '../services/api';
import { getCached, setCached } from '../utils/cache';

export function useDebtFilters(allExpenses, settlements, groupId, userEmail) {
  const [debtFilterCat,  setDebtFilterCat]  = useState('all');
  const [debtDatePreset, setDebtDatePreset] = useState('all');
  const [debtCustomFrom, setDebtCustomFrom] = useState('');
  const [debtCustomTo,   setDebtCustomTo]   = useState('');

  const getCategoryKey = (ed) => (ed.category || 'otros').trim().toLowerCase();

  const expenseDebts = useMemo(() => {
    // Enriquecer cada deuda con la categoría del gasto fuente
    const debts = computeExpenseDebts(allExpenses);
    for (const d of debts) {
      const src = allExpenses.find((e) => e.expense_id === d.expenseId);
      d.category = src?.category || 'otros';
    }
    return debts;
  }, [allExpenses]);

  const debtActiveDateRange = useMemo(
    () => getDateRange(debtDatePreset, debtCustomFrom, debtCustomTo),
    [debtDatePreset, debtCustomFrom, debtCustomTo]
  );

  const filteredExpenseDebts = useMemo(() => {
    return expenseDebts.filter((ed) => {
      if (debtFilterCat !== 'all' && getCategoryKey(ed) !== debtFilterCat) return false;
      const { from, to } = debtActiveDateRange;
      const edDate = (ed.date || '').substring(0, 10);
      if (from && edDate < from) return false;
      if (to   && edDate > to)   return false;
      return true;
    });
  }, [expenseDebts, debtFilterCat, debtActiveDateRange]);

  const filteredPendingDebts = useMemo(
    () => filteredExpenseDebts.filter((d) => !settlements[d.expenseId]?.settled),
    [filteredExpenseDebts, settlements]
  );
  const filteredSettledDebts = useMemo(
    () => filteredExpenseDebts.filter((d) =>  settlements[d.expenseId]?.settled),
    [filteredExpenseDebts, settlements]
  );

  const totalPendingDebt = useMemo(
    () => filteredPendingDebts.reduce((s, ed) => s + ed.debts.reduce((ss, d) => ss + d.amount, 0), 0),
    [filteredPendingDebts]
  );

  const debtAvailableCats = useMemo(() => {
    const keys = new Set(expenseDebts.map((ed) => getCategoryKey(ed)));
    return ['all', ...Array.from(keys)];
  }, [expenseDebts]);

  // Mapa expenseId → deuda pendiente (para badges en tab Gastos)
  const allPendingDebts = useMemo(
    () => expenseDebts.filter((d) => !settlements[d.expenseId]?.settled),
    [expenseDebts, settlements]
  );
  const pendingDebtByExpenseId = useMemo(() => {
    const map = {};
    for (const ed of allPendingDebts) map[ed.expenseId] = ed;
    return map;
  }, [allPendingDebts]);

  // Acciones
  const cacheKey = `group_${groupId}`;

  const updateSettlementsCache = (freshSettlements) => {
    const cached = getCached(cacheKey);
    if (cached?.data) {
      setCached(cacheKey, { ...cached.data, settlements: freshSettlements });
    }
  };

  const handleSettle = async (expenseId, toastFn, reloadSettlements) => {
    try {
      await markExpensePaid(expenseId, groupId, userEmail);
      const res = await reloadSettlements();
      updateSettlementsCache(res);
      toastFn?.('Deuda marcada como pagada');
    } catch {
      toastFn?.('Error al marcar como pagada', 'error');
    }
  };

  const handleUnsettle = async (expenseId, toastFn, reloadSettlements) => {
    try {
      await unmarkExpensePaid(expenseId, groupId);
      const res = await reloadSettlements();
      updateSettlementsCache(res);
      toastFn?.('Deuda reactivada');
    } catch {
      toastFn?.('Error al reactivar la deuda', 'error');
    }
  };

  return {
    debtFilterCat, setDebtFilterCat,
    debtDatePreset, setDebtDatePreset,
    debtCustomFrom, setDebtCustomFrom,
    debtCustomTo, setDebtCustomTo,
    expenseDebts, filteredExpenseDebts,
    filteredPendingDebts, filteredSettledDebts,
    totalPendingDebt, debtAvailableCats,
    pendingDebtByExpenseId,
    handleSettle, handleUnsettle,
    DATE_PRESET_ITEMS: DATE_PRESETS.map(({ key, label }) => ({ key, emoji: '📅', label })),
  };
}
