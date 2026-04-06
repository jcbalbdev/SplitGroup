// src/services/cache.js
// ─────────────────────────────────────────────────────────────
// Cache simple en localStorage para evitar llamadas repetidas
// a GAS en datos que no cambian frecuentemente.
// ─────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

export function cacheGet(key) {
  try {
    const raw = localStorage.getItem(`sg_cache_${key}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) {
      localStorage.removeItem(`sg_cache_${key}`);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function cacheSet(key, data) {
  try {
    localStorage.setItem(`sg_cache_${key}`, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // localStorage puede estar lleno — ignorar silenciosamente
  }
}

export function cacheInvalidate(key) {
  localStorage.removeItem(`sg_cache_${key}`);
}

export function cacheInvalidatePattern(pattern) {
  Object.keys(localStorage)
    .filter((k) => k.startsWith('sg_cache_') && k.includes(pattern))
    .forEach((k) => localStorage.removeItem(k));
}
