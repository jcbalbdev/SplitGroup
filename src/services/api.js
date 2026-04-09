// src/services/api.js
// Barrel re-export — mantiene todos los imports existentes funcionando.
// La lógica real vive en api/ subdirectorio por dominio.

export * from './api/auth';
export * from './api/groups';
export * from './api/expenses';
export * from './api/settlements';
export * from './api/budgets';
export * from './api/recurring';
export * from './api/externalDebts';
