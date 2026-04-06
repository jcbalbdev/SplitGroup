// src/utils/avatarPrefs.js
// Preferencias de avatar por email, guardadas en localStorage.
// Estructura: { "email@example.com": { variant: "beam", colors: [...] } }

const KEY = 'splitgroup_avatar_prefs';

export const VARIANTS = [
  { key: 'beam',    label: 'Carita',       preview: '😊' },
  { key: 'marble',  label: 'Mármol',       preview: '🔮' },
  { key: 'bauhaus', label: 'Bauhaus',      preview: '🔷' },
  { key: 'sunset',  label: 'Atardecer',    preview: '🌅' },
  { key: 'ring',    label: 'Anillos',      preview: '💍' },
  { key: 'pixel',   label: 'Pixel art',    preview: '🎮' },
];

export const PALETTES = [
  {
    key: 'purple',
    label: 'Morado',
    colors: ['#7c5cfc', '#c084fc', '#5a3ed4', '#e879f9', '#1e1b4b'],
  },
  {
    key: 'ocean',
    label: 'Océano',
    colors: ['#06b6d4', '#0ea5e9', '#7dd3fc', '#0891b2', '#083344'],
  },
  {
    key: 'sunset',
    label: 'Sunset',
    colors: ['#f97316', '#fb923c', '#fbbf24', '#ef4444', '#7c2d12'],
  },
  {
    key: 'forest',
    label: 'Bosque',
    colors: ['#4ade80', '#22c55e', '#86efac', '#15803d', '#052e16'],
  },
  {
    key: 'candy',
    label: 'Candy',
    colors: ['#f472b6', '#fb7185', '#a855f7', '#818cf8', '#be185d'],
  },
  {
    key: 'mono',
    label: 'Gris',
    colors: ['#94a3b8', '#64748b', '#cbd5e1', '#334155', '#0f172a'],
  },
];

export const DEFAULT_VARIANT = 'beam';
export const DEFAULT_PALETTE  = PALETTES[0];

export function getAvatarPrefs() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch { return {}; }
}

export function getAvatarPref(email) {
  const all = getAvatarPrefs();
  return all[email] || { variant: DEFAULT_VARIANT, palette: DEFAULT_PALETTE.key };
}

export function setAvatarPref(email, { variant, palette }) {
  const all = getAvatarPrefs();
  all[email] = { variant, palette };
  localStorage.setItem(KEY, JSON.stringify(all));
}

/** Devuelve los colores efectivos para un email dado. */
export function getColorsForEmail(email) {
  const pref    = getAvatarPref(email);
  const palette = PALETTES.find((p) => p.key === pref.palette) || DEFAULT_PALETTE;
  return palette.colors;
}

/** Devuelve el variant efectivo para un email dado. */
export function getVariantForEmail(email) {
  return getAvatarPref(email).variant || DEFAULT_VARIANT;
}
