// src/services/api/notifications.js
// Queries de actividad cross-group para el panel de notificaciones.
import { supabase } from '../supabase';

const DAYS_BACK = 7; // días de ventana para actividad reciente

/**
 * Retorna actividad reciente de otros miembros en todos los grupos del usuario,
 * más los gastos recurrentes activos del usuario (todas las plantillas vigentes).
 *
 * @param {string} userEmail - email del usuario autenticado
 * @returns {{ activity: Array, recurring: Array }}
 */
export const getNotifications = async (userEmail) => {
  const since = new Date();
  since.setDate(since.getDate() - DAYS_BACK);
  const sinceISO = since.toISOString();

  // ── 1. Actividad reciente: gastos registrados por otros miembros ──
  const { data: expData, error: expErr } = await supabase
    .from('expenses')
    .select(`
      expense_id, amount, description, category, date, created_at,
      created_by, paid_by,
      groups!inner(group_id, name),
      group_members!inner(user_email)
    `)
    .eq('group_members.user_email', userEmail)
    .neq('created_by', userEmail)
    .not('created_by', 'is', null)
    .gte('created_at', sinceISO)
    .order('created_at', { ascending: false })
    .limit(30);

  // ── 2. Presupuestos recientes de otros ──
  const { data: budData } = await supabase
    .from('budgets')
    .select(`
      budget_id, name, created_at, created_by,
      groups!inner(group_id, name),
      group_members!inner(user_email)
    `)
    .eq('group_members.user_email', userEmail)
    .neq('created_by', userEmail)
    .not('created_by', 'is', null)
    .gte('created_at', sinceISO)
    .order('created_at', { ascending: false })
    .limit(10);

  // ── 3. Recurrentes recientes de otros ──
  const { data: recData } = await supabase
    .from('recurring_expenses')
    .select(`
      recurring_id, description, amount, frequency, created_at, created_by,
      groups!inner(group_id, name),
      group_members!inner(user_email)
    `)
    .eq('group_members.user_email', userEmail)
    .neq('created_by', userEmail)
    .not('created_by', 'is', null)
    .gte('created_at', sinceISO)
    .order('created_at', { ascending: false })
    .limit(10);

  // ── 4. Mis gastos recurrentes activos (todas las plantillas propias) ──
  const { data: myRecurring } = await supabase
    .from('recurring_expenses')
    .select(`
      recurring_id, description, amount, frequency, next_due_date, is_active,
      groups!inner(group_id, name),
      group_members!inner(user_email)
    `)
    .eq('group_members.user_email', userEmail)
    .eq('is_active', true)
    .order('next_due_date', { ascending: true })
    .limit(20);

  // Normalizar actividad en un array unificado
  const activity = [
    ...(expData || []).map(e => ({
      id:         e.expense_id,
      type:       'expense',
      actor:      e.created_by,
      groupId:    e.groups?.group_id,
      groupName:  e.groups?.name,
      description: e.description || e.category || 'Gasto',
      amount:     parseFloat(e.amount),
      createdAt:  e.created_at,
    })),
    ...(budData || []).map(b => ({
      id:         b.budget_id,
      type:       'budget',
      actor:      b.created_by,
      groupId:    b.groups?.group_id,
      groupName:  b.groups?.name,
      description: b.name,
      amount:     null,
      createdAt:  b.created_at,
    })),
    ...(recData || []).map(r => ({
      id:         r.recurring_id,
      type:       'recurring',
      actor:      r.created_by,
      groupId:    r.groups?.group_id,
      groupName:  r.groups?.name,
      description: r.description,
      amount:     parseFloat(r.amount),
      createdAt:  r.created_at,
    })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    activity,
    myRecurring: myRecurring || [],
  };
};
