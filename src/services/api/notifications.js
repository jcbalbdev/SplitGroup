// src/services/api/notifications.js
// Queries de actividad cross-group para el panel de notificaciones.
import { supabase } from '../supabase';

const DAYS_BACK = 7;

export const getNotifications = async (userEmail) => {
  const since = new Date();
  since.setDate(since.getDate() - DAYS_BACK);
  const sinceISO = since.toISOString();

  // ── Paso 1: obtener IDs de los grupos donde el usuario es miembro ──
  const { data: memberships, error: memErr } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_email', userEmail);

  if (memErr || !memberships?.length) return { activity: [], myRecurring: [] };

  const groupIds = memberships.map(m => m.group_id);

  // ── Paso 2a: gastos recientes de otros en esos grupos ──
  const { data: expData } = await supabase
    .from('expenses')
    .select('expense_id, amount, description, category, created_at, created_by, group_id')
    .in('group_id', groupIds)
    .neq('created_by', userEmail)
    .not('created_by', 'is', null)
    .gte('created_at', sinceISO)
    .order('created_at', { ascending: false })
    .limit(30);

  // ── Paso 2b: presupuestos recientes de otros ──
  const { data: budData } = await supabase
    .from('budgets')
    .select('budget_id, name, created_at, created_by, group_id')
    .in('group_id', groupIds)
    .neq('created_by', userEmail)
    .not('created_by', 'is', null)
    .gte('created_at', sinceISO)
    .order('created_at', { ascending: false })
    .limit(10);

  // ── Paso 2c: recurrentes recientes de otros ──
  const { data: recData } = await supabase
    .from('recurring_expenses')
    .select('recurring_id, description, amount, frequency, created_at, created_by, group_id')
    .in('group_id', groupIds)
    .neq('created_by', userEmail)
    .not('created_by', 'is', null)
    .gte('created_at', sinceISO)
    .order('created_at', { ascending: false })
    .limit(10);

  // ── Paso 2d: mis recurrentes activos ──
  const { data: myRec } = await supabase
    .from('recurring_expenses')
    .select('recurring_id, description, amount, frequency, next_due_date, is_active, group_id')
    .in('group_id', groupIds)
    .eq('is_active', true)
    .order('next_due_date', { ascending: true })
    .limit(20);

  // ── Paso 3: obtener nombres de grupos para mapear group_id → name ──
  const { data: groupsData } = await supabase
    .from('groups')
    .select('group_id, name')
    .in('group_id', groupIds);

  const groupMap = {};
  (groupsData || []).forEach(g => { groupMap[g.group_id] = g.name; });

  // ── Normalizar actividad ──
  const activity = [
    ...(expData || []).map(e => ({
      id:          e.expense_id,
      type:        'expense',
      actor:       e.created_by,
      groupId:     e.group_id,
      groupName:   groupMap[e.group_id] || '',
      description: e.description || e.category || 'Gasto',
      amount:      parseFloat(e.amount),
      createdAt:   e.created_at,
    })),
    ...(budData || []).map(b => ({
      id:          b.budget_id,
      type:        'budget',
      actor:       b.created_by,
      groupId:     b.group_id,
      groupName:   groupMap[b.group_id] || '',
      description: b.name,
      amount:      null,
      createdAt:   b.created_at,
    })),
    ...(recData || []).map(r => ({
      id:          r.recurring_id,
      type:        'recurring',
      actor:       r.created_by,
      groupId:     r.group_id,
      groupName:   groupMap[r.group_id] || '',
      description: r.description,
      amount:      parseFloat(r.amount),
      createdAt:   r.created_at,
    })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const myRecurring = (myRec || []).map(r => ({
    ...r,
    groups: { group_id: r.group_id, name: groupMap[r.group_id] || '' },
  }));

  return { activity, myRecurring };
};
