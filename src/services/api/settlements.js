// src/services/api/settlements.js
// Funciones de liquidaciones y deudas.
import { supabase } from '../supabase';

const check = (error, msg) => {
  if (error) throw new Error(`${msg}: ${error.message}`);
};

export const getExpenseSettlements = async (groupId) => {
  const { data, error } = await supabase
    .from('expense_settlements')
    .select('*')
    .eq('group_id', groupId);

  if (error) {
    console.error('getExpenseSettlements error:', error);
    return { settlements: {} };
  }

  const settlements = {};
  for (const row of (data || [])) {
    settlements[row.expense_id] = {
      settled:    true,
      settled_by: row.settled_by,
      settled_at: row.settled_at,
    };
  }
  return { settlements };
};

export const markExpensePaid = async (expenseId, groupId, settledBy) => {
  const { error } = await supabase
    .from('expense_settlements')
    .upsert([{ expense_id: expenseId, group_id: groupId, settled_by: settledBy }], { onConflict: 'expense_id' });
  check(error, 'Error al marcar gasto como pagado');
  return { success: true };
};

export const unmarkExpensePaid = async (expenseId) => {
  const { error } = await supabase.from('expense_settlements').delete().eq('expense_id', expenseId);
  check(error, 'Error al desmarcar gasto');
  return { success: true };
};

export const settleDebt = async (groupId, fromUser, toUser, amount) => {
  const { error } = await supabase
    .from('settlements')
    .insert([{ group_id: groupId, from_user: fromUser, to_user: toUser, amount }]);
  check(error, 'Error al asentar la deuda');
  return { success: true };
};

export const getSettlements = async (groupId) => {
  const { data, error } = await supabase
    .from('settlements')
    .select('*')
    .eq('group_id', groupId);

  check(error, 'Error al cargar historial de deudas');
  return data;
};
