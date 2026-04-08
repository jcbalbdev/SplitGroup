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

/** Formatea un Date como YYYY-MM-DD en zona local (NO UTC). */
function fmt(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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
      // Lunes como inicio de semana (ISO 8601)
      const day = d.getDay();           // 0=Dom, 1=Lun … 6=Sáb
      const diff = (day === 0 ? 6 : day - 1);  // días desde el lunes
      d.setDate(d.getDate() - diff);
      return { from: fmt(d), to: fmt(now) };
    }
    case 'month':
      return { from: fmt(new Date(y, m, 1)), to: fmt(new Date(y, m + 1, 0)) };
    case 'last_month':
      return { from: fmt(new Date(y, m - 1, 1)), to: fmt(new Date(y, m, 0)) };
    case 'year':
      return { from: fmt(new Date(y, 0, 1)), to: fmt(new Date(y, 11, 31)) };
    default:
      return { from: '', to: '' };
  }
}
