// src/utils/nicknames.js
// Gestión de apodos por email, guardados en localStorage.
// Global: aplica a todos los grupos de la app.

const STORAGE_KEY = 'splitgroup_nicknames';

/** Lee el mapa email→apodo del localStorage */
export function getNicknames() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

/**
 * Guarda o elimina el apodo de un email.
 * Si nick es vacío, se elimina el apodo y vuelve al nombre por defecto.
 */
export function setNickname(email, nick) {
  const all = getNicknames();
  if (nick && nick.trim()) {
    all[email] = nick.trim();
  } else {
    delete all[email];
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/**
 * Retorna el apodo del email si existe, o el fragmento antes del @ como fallback.
 * @param {string} email
 * @param {Object} [nicknames] - opcional: mapa precargado para evitar leer localStorage en cada render
 */
export function displayName(email, nicknames) {
  if (!email) return '';
  const map = nicknames ?? getNicknames();
  return map[email] || email.split('@')[0];
}
