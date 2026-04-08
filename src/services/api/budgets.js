// src/services/api/budgets.js
// Funciones de presupuestos.
import { supabase } from '../supabase';

const check = (error, msg) => {
  if (error) throw new Error(`${msg}: ${error.message}`);
};

export const getBudgets = async (groupId) => {
  const { data, error } = await supabase
    .from('budgets')
    .select(`*, budget_items (*, budget_item_participants (user_email, share_amount))`)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });
  check(error, 'Error al obtener presupuestos');
  return { budgets: data || [] };
};

export const createBudget = async ({ group_id, name, target_date, created_by }) => {
  const { data, error } = await supabase
    .from('budgets')
    .insert([{ group_id, name, target_date: target_date || null, created_by }])
    .select().single();
  check(error, 'Error al crear presupuesto');
  return { budget: data };
};

export const updateBudget = async (budgetId, payload) => {
  const { error } = await supabase.from('budgets').update(payload).eq('budget_id', budgetId);
  check(error, 'Error al actualizar presupuesto');
  return { success: true };
};

export const deleteBudget = async (budgetId) => {
  // Manual cascade — evita fallos de RLS en Supabase
  const { data: items } = await supabase
    .from('budget_items')
    .select('item_id, status')
    .eq('budget_id', budgetId);

  if (items?.length) {
    const itemIds = items.map(i => i.item_id);
    await supabase.from('budget_item_participants').delete().in('item_id', itemIds);
    await supabase.from('budget_items').delete().eq('budget_id', budgetId);
  }

  const { error } = await supabase.from('budgets').delete().eq('budget_id', budgetId);
  check(error, 'Error al eliminar presupuesto');
  return { success: true };
};

export const addBudgetItem = async ({ budget_id, description, amount, paid_by, category, participants }) => {
  const { data: item, error: iError } = await supabase
    .from('budget_items')
    .insert([{ budget_id, description, amount, paid_by, category: category || 'otros' }])
    .select().single();
  check(iError, 'Error al agregar item');
  if (participants?.length) {
    const { error: pError } = await supabase
      .from('budget_item_participants')
      .insert(participants.map(p => ({ item_id: item.item_id, user_email: p.user_email, share_amount: p.share_amount })));
    check(pError, 'Error al agregar participantes del item');
  }
  return { item };
};

export const updateBudgetItem = async (itemId, { description, amount, paid_by, category, participants }) => {
  const { error: iError } = await supabase
    .from('budget_items').update({ description, amount, paid_by, category }).eq('item_id', itemId);
  check(iError, 'Error al actualizar item');
  if (participants) {
    await supabase.from('budget_item_participants').delete().eq('item_id', itemId);
    if (participants.length) {
      const { error: pError } = await supabase
        .from('budget_item_participants')
        .insert(participants.map(p => ({ item_id: itemId, user_email: p.user_email, share_amount: p.share_amount })));
      check(pError, 'Error al actualizar participantes');
    }
  }
  return { success: true };
};

export const deleteBudgetItem = async (itemId) => {
  const { error } = await supabase.from('budget_items').delete().eq('item_id', itemId);
  check(error, 'Error al eliminar item');
  return { success: true };
};

export const cancelBudgetItem = async (itemId) => {
  const { error } = await supabase.from('budget_items').update({ status: 'cancelled' }).eq('item_id', itemId);
  check(error, 'Error al cancelar item');
  return { success: true };
};

export const executeItem = async (itemId, groupId, date) => {
  const { data: item, error: fetchError } = await supabase
    .from('budget_items')
    .select('*, budget_item_participants(user_email, share_amount)')
    .eq('item_id', itemId).single();
  check(fetchError, 'Error al obtener item');

  // Formatear fecha
  let expenseDate = date;
  if (!expenseDate) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    expenseDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T12:00:00`;
  } else if (!expenseDate.includes('T')) {
    expenseDate = `${expenseDate}T12:00:00`;
  }

  const participants = item.budget_item_participants || [];
  let firstExpenseId = null;

  if (item.paid_by === 'multiple') {
    // Modo multi-pagador: crear sesión de gastos (uno por pagador)
    const sessionId = `ses_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    for (const payer of participants) {
      const { data: exp, error: eErr } = await supabase
        .from('expenses')
        .insert([{
          group_id:    groupId,
          amount:      payer.share_amount,
          paid_by:     payer.user_email,
          date:        expenseDate,
          description: item.description,
          category:    item.category || 'otros',
          session_id:  sessionId,
        }])
        .select().single();
      check(eErr, 'Error al crear gasto (multi-pagador)');

      if (!firstExpenseId) firstExpenseId = exp.expense_id;

      const { error: pErr } = await supabase
        .from('expense_participants')
        .insert([{ expense_id: exp.expense_id, user_email: payer.user_email, share_amount: payer.share_amount }]);
      check(pErr, 'Error al crear participante (multi-pagador)');
    }
  } else {
    // Modo un pagador: crear un único gasto
    const { data: expense, error: eError } = await supabase
      .from('expenses')
      .insert([{
        group_id:    groupId,
        amount:      item.amount,
        paid_by:     item.paid_by,
        date:        expenseDate,
        description: item.description,
        category:    item.category || 'otros',
        session_id:  null,
      }])
      .select().single();
    check(eError, 'Error al crear gasto desde item');
    firstExpenseId = expense.expense_id;

    if (participants.length) {
      const { error: pError } = await supabase
        .from('expense_participants')
        .insert(participants.map(p => ({
          expense_id:   expense.expense_id,
          user_email:   p.user_email,
          share_amount: p.share_amount,
        })));
      check(pError, 'Error al crear participantes');
    }
  }

  const { error: uError } = await supabase
    .from('budget_items')
    .update({ status: 'executed', expense_id: firstExpenseId })
    .eq('item_id', itemId);
  check(uError, 'Error al marcar item como ejecutado');
  return { success: true, expense_id: firstExpenseId };
};

export const executeAllItems = async (budgetId, groupId) => {
  const { data: items, error } = await supabase
    .from('budget_items').select('item_id').eq('budget_id', budgetId).eq('status', 'pending');
  check(error, 'Error al obtener items');
  await Promise.all((items || []).map(i => executeItem(i.item_id, groupId)));
  const { data: remaining } = await supabase
    .from('budget_items').select('item_id').eq('budget_id', budgetId).eq('status', 'pending');
  if (!remaining?.length) {
    await supabase.from('budgets').update({ status: 'completed' }).eq('budget_id', budgetId);
  }
  return { success: true };
};
