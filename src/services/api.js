// src/services/api.js
// ─────────────────────────────────────────────────────────────
// Todas las llamadas van al Google Apps Script Web App.
// ─────────────────────────────────────────────────────────────

import { cacheGet, cacheSet, cacheInvalidate, cacheInvalidatePattern } from './cache.js';

const GAS_URL = import.meta.env.VITE_GAS_URL || '';

async function callGAS(action, params = {}) {
  if (!GAS_URL) {
    throw new Error('GAS_URL no configurado. Agrega VITE_GAS_URL en tu archivo .env');
  }

  const url = new URL(GAS_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => {
    url.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : v);
  });

  const response = await fetch(url.toString(), { redirect: 'follow' });
  if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data;
}

/** Cache-first: respuesta instantánea si hay cache válido, GAS solo si no hay */
async function callGASCached(cacheKey, action, params = {}) {
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const data = await callGAS(action, params);
  cacheSet(cacheKey, data);
  return data;
}

// ── AUTH ──────────────────────────────────────────────────────
export const sendMagicLink = (email) =>
  callGAS('sendMagicLink', { email });

export const verifyToken = (token) =>
  callGAS('verifyToken', { token });

// ── GRUPOS ────────────────────────────────────────────────────
export const getGroups = (userEmail) =>
  callGASCached(`groups_${userEmail}`, 'getGroups', { userEmail });

export const createGroup = async (name, createdBy) => {
  const result = await callGAS('createGroup', { name, createdBy });
  cacheInvalidate(`groups_${createdBy}`);
  return result;
};

export const getGroupDetails = (groupId) =>
  callGASCached(`group_${groupId}`, 'getGroupDetails', { groupId });

export const inviteMember = async (groupId, email) => {
  const result = await callGAS('inviteMember', { groupId, email });
  cacheInvalidate(`group_${groupId}`);
  return result;
};

// ── GASTOS ────────────────────────────────────────────────────
export const addExpense = async (data) => {
  const result = await callGAS('addExpense', { data: JSON.stringify(data) });
  cacheInvalidate(`expenses_${data.group_id}`);
  cacheInvalidate(`balances_${data.group_id}`);
  cacheInvalidatePattern('groups_');
  return result;
};

export const updateExpense = async (data) => {
  const result = await callGAS('updateExpense', { data: JSON.stringify(data) });
  cacheInvalidate(`expenses_${data.group_id}`);
  cacheInvalidate(`balances_${data.group_id}`);
  cacheInvalidatePattern('groups_');
  return result;
};

export const deleteExpense = async (expenseId, groupId) => {
  const result = await callGAS('deleteExpense', { expenseId });
  cacheInvalidate(`expenses_${groupId}`);
  cacheInvalidate(`balances_${groupId}`);
  cacheInvalidatePattern('groups_');
  return result;
};

export const updateExpenseSession = async (data) => {
  const result = await callGAS('updateExpenseSession', { data: JSON.stringify(data) });
  cacheInvalidate(`expenses_${data.group_id}`);
  cacheInvalidate(`balances_${data.group_id}`);
  cacheInvalidatePattern('groups_');
  return result;
};

export const deleteExpenseSession = async (sessionId, groupId) => {
  const result = await callGAS('deleteExpenseSession', { sessionId });
  cacheInvalidate(`expenses_${groupId}`);
  cacheInvalidate(`balances_${groupId}`);
  cacheInvalidatePattern('groups_');
  return result;
};

export const getExpenses = (groupId) =>
  callGASCached(`expenses_${groupId}`, 'getExpenses', { groupId });

// ── BALANCES ──────────────────────────────────────────────────
export const getBalances = (groupId) =>
  callGASCached(`balances_${groupId}`, 'getBalances', { groupId });

export const settleDebt = async (groupId, fromUser, toUser, amount) => {
  const result = await callGAS('settleDebt', { groupId, fromUser, toUser, amount });
  cacheInvalidate(`balances_${groupId}`);
  cacheInvalidatePattern('groups_');
  return result;
};
