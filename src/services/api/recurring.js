// src/services/api/recurring.js
// CRUD para gastos recurrentes (plantillas) + ejecución automática.
import { supabase } from '../supabase';

const check = (error, msg) => {
  if (error) throw new Error(`${msg}: ${error.message}`);
};

// ── Helpers de fecha ──────────────────────────────────────────
function computeNextDueDate(currentDate, frequency) {
  const d = new Date(currentDate + 'T12:00:00'); // evitar timezone shift
  switch (frequency) {
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'biweekly':
      d.setDate(d.getDate() + 14);
      break;
    case 'monthly':
    default:
      d.setMonth(d.getMonth() + 1);
      break;
  }
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

// ── GET: listar recurrentes de un grupo ──────────────────────
export const getRecurringExpenses = async (groupId) => {
  const { data, error } = await supabase
    .from('recurring_expenses')
    .select(`*, recurring_expense_participants (user_email, share_amount)`)
    .eq('group_id', groupId)
    .order('next_due_date', { ascending: true });

  check(error, 'Error al obtener gastos recurrentes');

  return {
    recurring: (data || []).map((r) => ({
      recurring_id:   r.recurring_id,
      group_id:       r.group_id,
      amount:         r.amount,
      description:    r.description,
      category:       r.category,
      paid_by:        r.paid_by,
      frequency:      r.frequency,
      start_date:     r.start_date,
      next_due_date:  r.next_due_date,
      is_active:      r.is_active,
      created_by:     r.created_by,
      created_at:     r.created_at,
      participants:   (r.recurring_expense_participants || []).map((p) => ({
        user_email:   p.user_email,
        share_amount: p.share_amount,
      })),
    })),
  };
};

// ── ADD: crear nueva plantilla recurrente ─────────────────────
export const addRecurringExpense = async (payload) => {
  const { data: recurring, error: rError } = await supabase
    .from('recurring_expenses')
    .insert([{
      group_id:      payload.group_id,
      amount:        payload.amount,
      description:   payload.description,
      category:      payload.category || 'otros',
      paid_by:       payload.paid_by,
      frequency:     payload.frequency || 'monthly',
      start_date:    payload.start_date,
      next_due_date: payload.start_date, // la primera vez coincide
      is_active:     true,
      created_by:    payload.created_by,
    }])
    .select()
    .single();

  check(rError, 'Error al crear gasto recurrente');

  if (payload.participants?.length) {
    const parts = payload.participants.map((p) => ({
      recurring_id: recurring.recurring_id,
      user_email:   p.user_email,
      share_amount: p.share_amount,
    }));
    const { error: pError } = await supabase
      .from('recurring_expense_participants')
      .insert(parts);
    check(pError, 'Error al añadir participantes recurrentes');
  }

  return { success: true, recurring };
};

// ── UPDATE: editar plantilla ──────────────────────────────────
export const updateRecurringExpense = async (recurringId, payload) => {
  const { error: rError } = await supabase
    .from('recurring_expenses')
    .update({
      amount:        payload.amount,
      description:   payload.description,
      category:      payload.category,
      paid_by:       payload.paid_by,
      frequency:     payload.frequency,
      is_active:     payload.is_active,
    })
    .eq('recurring_id', recurringId);

  check(rError, 'Error al actualizar gasto recurrente');

  // Reemplazar participantes
  if (payload.participants) {
    await supabase
      .from('recurring_expense_participants')
      .delete()
      .eq('recurring_id', recurringId);

    if (payload.participants.length) {
      const parts = payload.participants.map((p) => ({
        recurring_id: recurringId,
        user_email:   p.user_email,
        share_amount: p.share_amount,
      }));
      const { error: pError } = await supabase
        .from('recurring_expense_participants')
        .insert(parts);
      check(pError, 'Error al actualizar participantes recurrentes');
    }
  }

  return { success: true };
};

// ── DELETE: eliminar plantilla ────────────────────────────────
export const deleteRecurringExpense = async (recurringId) => {
  const { error } = await supabase
    .from('recurring_expenses')
    .delete()
    .eq('recurring_id', recurringId);
  check(error, 'Error al eliminar gasto recurrente');
  return { success: true };
};

// ── TOGGLE: pausar / reanudar ────────────────────────────────
export const toggleRecurringExpense = async (recurringId, isActive) => {
  const { error } = await supabase
    .from('recurring_expenses')
    .update({ is_active: isActive })
    .eq('recurring_id', recurringId);
  check(error, 'Error al cambiar estado recurrente');
  return { success: true };
};

// ── EXECUTE: crear gasto real desde plantilla ────────────────
// Se ejecuta automáticamente al cargar el grupo si next_due_date <= hoy.
// expenseDate: fecha del gasto a crear (por defecto hoy, pero puede ser histórica para catch-up).
export const executeRecurringExpense = async (recurring, expenseDate = null) => {
  const today = new Date().toISOString().split('T')[0];
  const date  = expenseDate || today;

  // 1. Crear el gasto real (con referencia a la plantilla)
  const { data: expense, error: eError } = await supabase
    .from('expenses')
    .insert([{
      group_id:     recurring.group_id,
      amount:       recurring.amount,
      paid_by:      recurring.paid_by,
      date,
      description:  recurring.description,
      category:     recurring.category || 'otros',
      session_id:   '',
      recurring_id: recurring.recurring_id,
    }])
    .select()
    .single();

  check(eError, 'Error al crear gasto desde recurrente');

  // 2. Crear participantes
  if (recurring.participants?.length) {
    const parts = recurring.participants.map((p) => ({
      expense_id:   expense.expense_id,
      user_email:   p.user_email,
      share_amount: p.share_amount,
    }));
    const { error: pError } = await supabase
      .from('expense_participants')
      .insert(parts);
    check(pError, 'Error al añadir participantes');
  }

  // 3. Avanzar next_due_date desde la fecha del gasto creado
  const nextDate = computeNextDueDate(date, recurring.frequency);
  await supabase
    .from('recurring_expenses')
    .update({ next_due_date: nextDate })
    .eq('recurring_id', recurring.recurring_id);

  return { success: true, expense, nextDate };
};
