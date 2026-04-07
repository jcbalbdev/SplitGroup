// src/utils/cache.js
// Stale-while-revalidate cache usando localStorage
// Si hay datos en caché → muestra al instante + refresca en background sin interrumpir

const PREFIX = 'sg_cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos: fuerza skip-spinner si es más viejo

export function getCached(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed; // { data, ts }
  } catch {
    return null;
  }
}

export function setCached(key, data) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
  } catch (_) {
    // localStorage lleno — no bloquear
  }
}

export function clearCached(key) {
  try { localStorage.removeItem(PREFIX + key); } catch (_) {}
}

/** ¿Tiene datos y no es muy viejo? */
export function hasFreshCache(key, ttl = DEFAULT_TTL) {
  const c = getCached(key);
  if (!c) return false;
  return (Date.now() - c.ts) < ttl;
}
