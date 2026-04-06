// src/utils/categories.js
// Fuente única de verdad para categorías de gastos.
// Importar desde aquí; NO duplicar en páginas ni componentes.

export const CATEGORIES = [
  { key: 'comida',          emoji: '🍽️', label: 'Comida',          keywords: ['comid','restaur','almuerz','cena','cita','desayun','pizz','sushi'] },
  { key: 'mercado',         emoji: '🛒', label: 'Mercado',          keywords: ['super','mercad','tiend','compra'] },
  { key: 'transporte',      emoji: '🚗', label: 'Transporte',       keywords: ['transport','uber','taxi','bus','metro','gasolina','combust'] },
  { key: 'renta',           emoji: '🏠', label: 'Renta/Casa',       keywords: ['rent','alquil','luz','agua','internet','casa','depart'] },
  { key: 'entretenimiento', emoji: '🎉', label: 'Entretenimiento',  keywords: ['entrad','cine','fiesta','concierto','evento','bar'] },
  { key: 'viaje',           emoji: '✈️', label: 'Viaje',            keywords: ['viaj','hotel','vuelo','hostal','pasaje','tour'] },
  { key: 'salud',           emoji: '💊', label: 'Salud',            keywords: ['salud','farmaci','médic','doctor','clinic','hospital'] },
  { key: 'otros',           emoji: '💰', label: 'Otros',            keywords: [] },
];

/** Detecta la categoría predefinida de una descripción via keywords */
export function detectCategory(desc = '') {
  const d = desc.toLowerCase();
  return CATEGORIES.find((c) => c.keywords.some((kw) => d.includes(kw)))?.key ?? 'otros';
}

/** Retorna los metadatos de una categoría por su key */
export function getCategoryMeta(key) {
  return CATEGORIES.find((c) => c.key === key) ?? { key: 'otros', emoji: '💰', label: 'Otros' };
}

/** Retorna el emoji de una categoría a partir de su descripción (auto-detección) */
export function getCategoryEmojiFromDesc(desc = '') {
  return getCategoryMeta(detectCategory(desc)).emoji;
}
