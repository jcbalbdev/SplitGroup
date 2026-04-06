// src/utils/categoryOverrides.js
// Persiste sobreescrituras de categoría por gasto en localStorage.
// Estructura: { expense_id: { key: string, label: string, emoji: string } }
// key = '' significa "sin override" (usa auto-detección)

const KEY = 'splitgroup_category_overrides';

export function getCategoryOverrides() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch { return {}; }
}

export function getCategoryOverride(expenseId) {
  return getCategoryOverrides()[expenseId] || null;
}

/** Guarda una categoría personalizada para un gasto */
export function setCategoryOverride(expenseId, { key, label, emoji }) {
  const all = getCategoryOverrides();
  all[expenseId] = { key, label, emoji };
  localStorage.setItem(KEY, JSON.stringify(all));
}

/** Elimina el override (vuelve a auto-detección) */
export function clearCategoryOverride(expenseId) {
  const all = getCategoryOverrides();
  delete all[expenseId];
  localStorage.setItem(KEY, JSON.stringify(all));
}
