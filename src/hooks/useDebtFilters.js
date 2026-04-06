// src/hooks/useDebtFilters.js
import { useState, useMemo } from 'react';
import { detectCategory } from '../utils/categories';
import { DATE_PRESETS, getDateRange } from '../utils/datePresets';
import { computeExpenseDebts } from '../utils/balanceCalculator';
import { getSettlements, settleDebt, unsettleDebt } from '../utils/debtSettlements';
import { getCategoryOverrides } from '../utils/categoryOverrides';

export function useDebtFilters(allExpenses, categoryOverrides, userEmail) {
  const [debtFilterCat,  setDebtFilterCat]  = useState('all');
  const [debtDatePreset, setDebtDatePreset] = useState('all');
  const [debtCustomFrom, setDebtCustomFrom] = useState('');
  const [debtCustomTo,   setDebtCustomTo]   = useState('');
  const [settlements, setSettlements]       = useState(getSettlements);

  // Helper: clave de categoría para una deuda (usa expenseId, no expense_id)
  const getDebtCategoryKey = (ed) => {
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
  }, [expenseDebts, debtFilterCat, debtActiveDateRange, categoryOverrides]);

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
  }, [expenseDebts, categoryOverrides]);

  // Mapa expenseId → deuda pendiente (para badges en Gastos)
  const allPendingDebts = useMemo(
    () => expenseDebts.filter((d) => !settlements[d.expenseId]?.settled),
    [expenseDebts, settlements]
  );
  const pendingDebtByExpenseId = useMemo(() => {
    const map = {};
    for (const ed of allPendingDebts) map[ed.expenseId] = ed;
    return map;
  }, [allPendingDebts]);

  const handleSettle = (expenseId, toastFn) => {
    settleDebt(expenseId);
    setSettlements(getSettlements());
    toastFn?.('Deuda marcada como pagada ✅');
  };

  const handleUnsettle = (expenseId, toastFn) => {
    unsettleDebt(expenseId);
    setSettlements(getSettlements());
    toastFn?.('Deuda reactivada');
  };

  return {
    debtFilterCat, setDebtFilterCat,
    debtDatePreset, setDebtDatePreset,
    debtCustomFrom, setDebtCustomFrom,
    debtCustomTo, setDebtCustomTo,
    settlements,
    expenseDebts, filteredExpenseDebts,
    filteredPendingDebts, filteredSettledDebts,
    totalPendingDebt, debtAvailableCats,
    pendingDebtByExpenseId,
    handleSettle, handleUnsettle,
    DATE_PRESET_ITEMS: DATE_PRESETS.map(({ key, label }) => ({ key, emoji: '📅', label })),
  };
}
