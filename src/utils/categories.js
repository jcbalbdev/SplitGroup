// src/utils/categories.js
// Categorías dinámicas: se guardan las usadas en localStorage por grupo.

const CACHE_KEY = 'sg_used_categories';

/** Obtener categorías usadas previamente en este grupo. */
export function getUsedCategories(groupId) {
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    return Array.isArray(all[groupId]) ? all[groupId] : [];
  } catch { return []; }
}

/** Registrar una categoría usada para sugerencias futuras. */
export function saveUsedCategory(groupId, category) {
  if (!category?.trim()) return;
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

/** Emoji cosmético basado en el nombre de la categoría. */
export function getCategoryEmoji(cat = '') {
  const c = cat.toLowerCase();
  const map = {
    comida: '🍽️', mercado: '🛒', transporte: '🚗', renta: '🏠',
    entretenimiento: '🎉', viaje: '✈️', salud: '💊', gym: '💪',
    mascota: '🐾', educacion: '📚', ropa: '👕', tecnologia: '💻',
    desayuno: '🥐', almuerzo: '🍛', cena: '🌙', cafe: '☕',
  };
  return Object.entries(map).find(([k]) => c.includes(k))?.[1] || '🏷️';
}
