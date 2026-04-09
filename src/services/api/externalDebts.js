// src/services/api/externalDebts.js
// CRUD para deudas externas (grupos individuales — cuaderno IOU).
// Los deudores son personas externas identificadas solo por nombre.
import { supabase } from '../supabase';

const check = (error, msg) => {
  if (error) throw new Error(`${msg}: ${error.message}`);
};

// ── GET ──────────────────────────────────────────────────────
export const getExternalDebts = async (groupId) => {
  const { data, error } = await supabase
    .from('external_debts')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  check(error, 'Error al obtener deudas externas');
  return { externalDebts: data || [] };
};

// ── ADD ──────────────────────────────────────────────────────
export const addExternalDebt = async ({ group_id, created_by, debtor_name, amount, description, category, date }) => {
  const { data, error } = await supabase
    .from('external_debts')
    .insert([{
      group_id,
      created_by,
      debtor_name: debtor_name.trim(),
      amount,
      description: description?.trim() || null,
      category:    category || 'otros',
      date,
      status:      'pending',
    }])
    .select()
    .single();

  check(error, 'Error al crear deuda externa');
  return { externalDebt: data };
};

// ── SETTLE ───────────────────────────────────────────────────
export const settleExternalDebt = async (id) => {
  const { error } = await supabase
    .from('external_debts')
    .update({ status: 'settled', settled_at: new Date().toISOString() })
    .eq('id', id);
  check(error, 'Error al marcar deuda como cobrada');
  return { success: true };
};

// ── UNSETTLE ─────────────────────────────────────────────────
export const unsettleExternalDebt = async (id) => {
  const { error } = await supabase
    .from('external_debts')
    .update({ status: 'pending', settled_at: null })
    .eq('id', id);
  check(error, 'Error al reactivar deuda');
  return { success: true };
};

// ── DELETE ───────────────────────────────────────────────────
export const deleteExternalDebt = async (id) => {
  const { error } = await supabase
    .from('external_debts')
    .delete()
    .eq('id', id);
  check(error, 'Error al eliminar deuda externa');
  return { success: true };
};
