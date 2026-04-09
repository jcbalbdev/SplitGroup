// src/services/api/expenses.js
// Funciones de gestión de gastos.
import { supabase } from '../supabase';

const check = (error, msg) => {
  if (error) throw new Error(`${msg}: ${error.message}`);
};

export const getExpenses = async (groupId) => {
  const { data, error } = await supabase
    .from('expenses')
    .select(`*, expense_participants (user_email, share_amount)`)
    .eq('group_id', groupId)
    .order('date', { ascending: false });

  check(error, 'Error al obtener gastos');

  return {
    expenses: (data || []).map(exp => ({
      expense_id:   exp.expense_id,
      group_id:     exp.group_id,
      amount:       exp.amount,
      paid_by:      exp.paid_by,
      date:         exp.date,
      description:  exp.description,
      category:     exp.category,
      session_id:   exp.session_id,
      recurring_id: exp.recurring_id ?? null,
      created_at:   exp.created_at,
      participants: exp.expense_participants.map(p => ({
        user_email:   p.user_email,
        share_amount: p.share_amount,
      })),
    })),
  };
};

export const addExpense = async (payload) => {
  const { data: expense, error: eError } = await supabase
    .from('expenses')
    .insert([{
      group_id:    payload.group_id,
      amount:      payload.amount,
      paid_by:     payload.paid_by,
      date:        payload.date,
      description: payload.description,
      category:    payload.category || 'otros',
      session_id:  payload.session_id || '',
      created_by:  payload.created_by || null,
    }])
    .select()
    .single();

  check(eError, 'Error al añadir gasto');

  const participantsData = payload.participants.map(p => ({
    expense_id:   expense.expense_id,
    user_email:   p.user_email,
    share_amount: p.share_amount,
  }));

  const { error: pError } = await supabase
    .from('expense_participants')
    .insert(participantsData);

  check(pError, 'Error al añadir participantes');
  return { success: true, expense_id: expense.expense_id };
};

export const updateExpense = async (payload) => {
  const { error: eError } = await supabase
    .from('expenses')
    .update({
      amount:      payload.amount,
      paid_by:     payload.paid_by,
      date:        payload.date,
      description: payload.description,
      category:    payload.category,
    })
    .eq('expense_id', payload.expense_id);

  check(eError, 'Error al actualizar gasto');

  await supabase.from('expense_participants').delete().eq('expense_id', payload.expense_id);

  const participantsData = payload.participants.map(p => ({
    expense_id:   payload.expense_id,
    user_email:   p.user_email,
    share_amount: p.share_amount,
  }));

  const { error: pError } = await supabase
    .from('expense_participants')
    .insert(participantsData);

  check(pError, 'Error al actualizar participantes');
  return { success: true };
};

export const deleteExpense = async (expenseId) => {
  const { error } = await supabase.from('expenses').delete().eq('expense_id', expenseId);
  check(error, 'Error al eliminar gasto');
  return { success: true };
};

// ── SESIONES ──────────────────────────────────────────────────
export const updateExpenseSession = async ({ session_id, group_id, description, date, payers }) => {
  const results = await Promise.all(
    payers.map(({ expense_id, amount }) =>
      supabase.from('expenses').update({ description, date, amount }).eq('expense_id', expense_id).eq('group_id', group_id)
    )
  );
  const errorResult = results.find((r) => r.error);
  if (errorResult?.error) throw new Error('Error al actualizar sesión: ' + errorResult.error.message);
  return { success: true };
};

export const deleteExpenseSession = async (sessionId, groupId) => {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('session_id', sessionId)
    .eq('group_id', groupId);
  check(error, 'Error al eliminar sesión');
  return { success: true };
};
