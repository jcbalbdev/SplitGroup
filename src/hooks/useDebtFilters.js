// src/hooks/useDebtFilters.js
import { useMemo } from 'react';
import { detectCategory } from '../utils/categories';
import { DATE_PRESETS, getDateRange } from '../utils/datePresets';
import { computeExpenseDebts } from '../utils/balanceCalculator';
import { markExpensePaid, unmarkExpensePaid } from '../services/api';
import { useState } from 'react';

export function useDebtFilters(allExpenses, settlements, groupId, userEmail) {
  const [debtFilterCat,  setDebtFilterCat]  = useState('all');
  const [debtDatePreset, setDebtDatePreset] = useState('all');
  const [debtCustomFrom, setDebtCustomFrom] = useState('');
  const [debtCustomTo,   setDebtCustomTo]   = useState('');

  // Helper: clave de categoría para una deuda
  const getDebtCategoryKey = (ed, categoryOverrides = {}) => {
    const ov = categoryOverrides[ed.expenseId];
    if (ov) return ov.key === 'otros' ? `custom_${ov.label}` : ov.key;
    return detectCategory(ed.description);
  };

  const expenseDebts = useMemo(() => computeExpenseDebts(allExpenses), [allExpenses]);

  const debtActiveDateRange = useMemo(
    () => getDateRange(debtDatePreset, debtCustomFrom, debtCustomTo),
    [debtDatePreset, debtCustomFrom, debtCustomTo]
  );

  const filteredExpenseDebts = useMemo(() => {
    return expenseDebts.filter((ed) => {
      if (debtFilterCat !== 'all' && getDebtCategoryKey(ed) !== debtFilterCat) return false;
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
    const keys = new Set(expenseDebts.map((ed) => getDebtCategoryKey(ed)));
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

  // Acciones — llaman a la API y luego recargan el estado
  const handleSettle = async (expenseId, toastFn, reloadSettlements) => {
    try {
      await markExpensePaid(expenseId, groupId, userEmail);
      await reloadSettlements();
      toastFn?.('Deuda marcada como pagada ✅');
    } catch {
      toastFn?.('Error al marcar como pagada', 'error');
    }
  };

  const handleUnsettle = async (expenseId, toastFn, reloadSettlements) => {
    try {
      await unmarkExpensePaid(expenseId, groupId);
      await reloadSettlements();
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
