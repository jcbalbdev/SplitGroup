// src/utils/debtSettlements.js
// Gestiona el estado de liquidación por gasto individual en localStorage.
// Estructura: { expense_id: { settled: bool, settledAt: "YYYY-MM-DD" } }

const KEY = 'splitgroup_debt_settlements';

export function getSettlements() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch { return {}; }
}

export function isSettled(expenseId) {
  return !!getSettlements()[expenseId]?.settled;
}

export function getSettledAt(expenseId) {
  return getSettlements()[expenseId]?.settledAt || null;
}

export function settleDebt(expenseId) {
  const all = getSettlements();
  all[expenseId] = { settled: true, settledAt: new Date().toISOString().split('T')[0] };
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function unsettleDebt(expenseId) {
  const all = getSettlements();
  delete all[expenseId];
  localStorage.setItem(KEY, JSON.stringify(all));
}
