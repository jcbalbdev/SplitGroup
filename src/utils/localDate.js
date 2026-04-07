// src/utils/localDate.js
// Obtener la fecha local en formato YYYY-MM-DD (zona horaria del usuario, no UTC)

export function getLocalDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
