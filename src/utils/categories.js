// src/utils/categories.js
// Categorías dinámicas: se guardan las usadas en localStorage por grupo.
// No hay categorías predefinidas.

const CACHE_KEY = 'sg_used_categories';

/**
 * Obtener categorías usadas previamente en este grupo.
 * Devuelve un array de strings únicas.
 */
export function getUsedCategories(groupId) {
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    return Array.isArray(all[groupId]) ? all[groupId] : [];
  } catch {
    return [];
  }
}

/**
 * Registrar una categoría usada para este grupo.
 * Se guarda al crear/editar un gasto.
 */
export function saveUsedCategory(groupId, category) {
  if (!category || !category.trim()) return;
  try {
    const all  = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const list = Array.isArray(all[groupId]) ? all[groupId] : [];
    const clean = category.trim().toLowerCase();
    if (!list.includes(clean)) {
      list.push(clean);
      all[groupId] = list;
      localStorage.setItem(CACHE_KEY, JSON.stringify(all));
    }
  } catch (_) {}
}

/** Retorna el emoji de una categoría (básico, solo cosmético) */
export function getCategoryEmoji(cat = '') {
  const c = cat.toLowerCase();
  const map = {
    comida: '🍽️', mercado: '🛒', transporte: '🚗', renta: '🏠',
    entretenimiento: '🎉', viaje: '✈️', salud: '💊', gym: '💪',
    mascota: '🐾', educacion: '📚', ropa: '👕', tecnologia: '💻',
  };
  return Object.entries(map).find(([k]) => c.includes(k))?.[1] || '🏷️';
}

/** Retrocompatibilidad */
export function getCategoryMeta(key) {
  return { key, emoji: getCategoryEmoji(key), label: key || 'Otros' };
}

export function getCategoryEmojiFromDesc(desc = '') {
  return getCategoryEmoji(desc);
}

// Backward-compatible exports (no longer used for UI, but other files import them)
export const CATEGORIES = [];
export function detectCategory(_desc = '') {
  return 'otros';
}

