// src/utils/datePresets.js
// Fuente única de verdad para presets de filtro por fecha.

export const DATE_PRESETS = [
  { key: 'all',        label: 'Todo' },
  { key: 'week',       label: 'Esta semana' },
  { key: 'month',      label: 'Este mes' },
  { key: 'last_month', label: 'Mes anterior' },
  { key: 'year',       label: 'Este año' },
  { key: 'custom',     label: '📅 Personalizado' },
];

/**
 * Calcula el rango { from, to } a partir de un preset.
 * Para 'custom' usa los parámetros customFrom / customTo.
 * Para 'all' retorna { from: '', to: '' } (sin filtro).
 */
export function getDateRange(preset, customFrom = '', customTo = '') {
  if (preset === 'custom') return { from: customFrom, to: customTo };
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case 'week': {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      return { from: d.toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
    }
    case 'month':
      return { from: new Date(y, m, 1).toISOString().split('T')[0], to: new Date(y, m + 1, 0).toISOString().split('T')[0] };
    case 'last_month':
      return { from: new Date(y, m - 1, 1).toISOString().split('T')[0], to: new Date(y, m, 0).toISOString().split('T')[0] };
    case 'year':
      return { from: new Date(y, 0, 1).toISOString().split('T')[0], to: new Date(y, 11, 31).toISOString().split('T')[0] };
    default:
      return { from: '', to: '' };
  }
}
