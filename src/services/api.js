// src/services/api.js
import { supabase } from './supabase';

/**
 * Función auxiliar para procesar respuestas de Supabase
 */
const handleResponse = (data, error, customErrorMessage) => {
  if (error) {
    console.error('Supabase Error:', error);
    throw new Error(customErrorMessage || error.message || 'Error de conexión con la base de datos');
  }
  return data;
};

// ── AUTH (Manejado por Supabase Auth en AuthContext, pero exportamos firmas compatibles) ──
// Ahora Supabase Auth se encarga del login, pero mantenemos compatibilidad por si se usa.
export const sendMagicLink = async (email) => {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true }
  });
  if (error) throw new Error(error.message);
  return { success: true };
};

export const registerUser = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('No se pudo crear la cuenta');
  return {
    email: data.user.email,
    name: data.user.email.split('@')[0],
    // session es null si se requiere confirmar email, objeto si no
    session: data.session,
  };
};

export const verifyToken = async (email, token) => {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw new Error('Código incorrecto o expirado');
  return { email: data.user.email, name: data.user.email.split('@')[0] };
};

export const loginWithPassword = async (email, password) => {
  const { data, error } = await Promise.race([
    supabase.auth.signInWithPassword({ email, password }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('La conexión tardó demasiado. Verifica tu internet e intenta de nuevo.')), 10000)
    ),
  ]);
  if (error) throw new Error(error.message);
  return { email: data.user.email, name: data.user.email.split('@')[0] };
};

export const setPassword = async (email, newPassword) => {
  // En Supabase, para setear password primero tienes que estar auth.
  // AuthContext ya debería tener la sesión activa.
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
  return { success: true };
};

// ── GRUPOS ────────────────────────────────────────────────────
export const getGroups = async (userEmail) => {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      group_id,
      groups:group_id (name, created_by, created_at)
    `)
    .eq('user_email', userEmail);

  if (error) return handleResponse(null, error, 'Error al obtener grupos');

  const groupIds = data.map((d) => d.group_id);

  // Contar miembros reales por grupo
  let countMap = {};
  if (groupIds.length > 0) {
    const { data: counts } = await supabase
      .from('group_members')
      .select('group_id')
      .in('group_id', groupIds);
    (counts || []).forEach((row) => {
      countMap[row.group_id] = (countMap[row.group_id] || 0) + 1;
    });
  }

  const groups = data.map((item) => ({
    group_id:    item.group_id,
    name:        item.groups?.name,
    created_by:  item.groups?.created_by,
    created_at:  item.groups?.created_at,
    memberCount: countMap[item.group_id] || 0,
  }));

  return { groups };
};

export const createGroup = async (name, createdBy) => {
  const { data: group, error } = await supabase
    .from('groups')
    .insert([{ name, created_by: createdBy }])
    .select()
    .single();

  if (error) return handleResponse(null, error, 'Error al crear grupo');

  // Añadir creador como miembro
  await supabase
    .from('group_members')
    .insert([{ group_id: group.group_id, user_email: createdBy }]);

  return { success: true, group_id: group.group_id };
};

export const getGroupDetails = async (groupId) => {
  const { data: group, error: gError } = await supabase
    .from('groups')
    .select('*')
    .eq('group_id', groupId)
    .single();

  if (gError) throw new Error('Grupo no encontrado');

  const { data: members } = await supabase
    .from('group_members')
    .select('user_email, nickname')
    .eq('group_id', groupId);

  return {
    group: {
      group_id:   group.group_id,
      name:       group.name,
      created_by: group.created_by,
      created_at: group.created_at,
    },
    members: members?.map(m => ({ user_email: m.user_email, nickname: m.nickname || '' })) || [],
  };
};

export const setGroupNickname = async (groupId, email, nickname) => {
  const { error } = await supabase.rpc('update_group_member_nickname', {
    p_group_id: groupId,
    p_email:    email.toLowerCase().trim(),
    p_nickname: nickname || '',
  });
  if (error) throw new Error('Error guardando apodo: ' + error.message);
  return { success: true };
};

export const inviteAndCreateMember = async (groupId, email, password) => {
  const lowerEmail = email.toLowerCase().trim();

  // Llama a la función SQL que crea el usuario directamente en auth.users
  // Es instantánea: no envía emails ni hace peticiones lentas.
  const { data, error } = await supabase.rpc('create_member_and_add_to_group', {
    p_email:    lowerEmail,
    p_password: password,
    p_group_id: groupId,
  });

  if (error) throw new Error('Error al crear miembro: ' + error.message);
  return { success: true };
};

// Alias para compatibilidad con código antiguo
export const inviteMember = inviteAndCreateMember;


export const deleteGroup = async (groupId) => {
  const { error } = await supabase.from('groups').delete().eq('group_id', groupId);
  return handleResponse({ success: true }, error, 'Error al eliminar grupo');
};

// ── GASTOS ────────────────────────────────────────────────────
export const getExpenses = async (groupId) => {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      expense_participants (user_email, share_amount)
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) return handleResponse(null, error, 'Error al obtener gastos');

  // Mapear al formato antiguo
  return data.map(exp => ({
    expense_id: exp.expense_id,
    group_id: exp.group_id,
    amount: exp.amount,
    paid_by: exp.paid_by,
    date: exp.date,
    description: exp.description,
    category: exp.category,
    session_id: exp.session_id,
    created_at: exp.created_at,
    participants: exp.expense_participants.map(p => ({
      email: p.user_email,
      share_amount: p.share_amount
    }))
  }));
};

export const addExpense = async (payload) => {
  const { data: expense, error: eError } = await supabase
    .from('expenses')
    .insert([{
      group_id: payload.group_id,
      amount: payload.amount,
      paid_by: payload.paid_by,
      date: payload.date,
      description: payload.description,
      category: payload.category,
      session_id: payload.session_id || ''
    }])
    .select()
    .single();

  if (eError) return handleResponse(null, eError, 'Error al añadir gasto');

  const participantsData = payload.participants.map(p => ({
    expense_id: expense.expense_id,
    user_email: p.user_email,
    share_amount: p.share_amount
  }));

  const { error: pError } = await supabase
    .from('expense_participants')
    .insert(participantsData);

  return handleResponse({ success: true }, pError, 'Error al añadir participantes');
};

export const updateExpense = async (payload) => {
  const { error: eError } = await supabase
    .from('expenses')
    .update({
      amount: payload.amount,
      paid_by: payload.paid_by,
      date: payload.date,
      description: payload.description,
      category: payload.category
    })
    .eq('expense_id', payload.expense_id);

  if (eError) return handleResponse(null, eError, 'Error al actualizar gasto');

  // Borrar participantes antiguos
  await supabase.from('expense_participants').delete().eq('expense_id', payload.expense_id);

  // Insertar nuevos
  const participantsData = payload.participants.map(p => ({
    expense_id: payload.expense_id,
    user_email: p.user_email,
    share_amount: p.share_amount
  }));

  const { error: pError } = await supabase
    .from('expense_participants')
    .insert(participantsData);

  return handleResponse({ success: true }, pError, 'Error al actualizar participantes');
};

export const deleteExpense = async (expenseId) => {
  const { error } = await supabase.from('expenses').delete().eq('expense_id', expenseId);
  return handleResponse({ success: true }, error, 'Error al eliminar gasto');
};

// ── LIQUIDACIONES DE DEUDA Y GASTOS PAGADOS ───────────────────
export const getExpenseSettlements = async (groupId) => {
  const { data, error } = await supabase
    .from('expense_settlements')
    .select('*')
    .eq('group_id', groupId);

  if (error) return handleResponse(null, error, 'Error al cargar liquidaciones');
  return data;
};

export const markExpensePaid = async (expenseId, groupId, settledBy) => {
  const { error } = await supabase
    .from('expense_settlements')
    .insert([{ expense_id: expenseId, group_id: groupId, settled_by: settledBy }]);
  return handleResponse({ success: true }, error, 'Error al marcar gasto como pagado');
};

export const unmarkExpensePaid = async (expenseId) => {
  const { error } = await supabase.from('expense_settlements').delete().eq('expense_id', expenseId);
  return handleResponse({ success: true }, error, 'Error al desmarcar gasto');
};

export const settleDebt = async (groupId, fromUser, toUser, amount) => {
  const { error } = await supabase
    .from('settlements')
    .insert([{ group_id: groupId, from_user: fromUser, to_user: toUser, amount }]);
  return handleResponse({ success: true }, error, 'Error al asentar la deuda');
};

export const getSettlements = async (groupId) => {
  const { data, error } = await supabase
    .from('settlements')
    .select('*')
    .eq('group_id', groupId);

  if (error) return handleResponse(null, error, 'Error al cargar historial de deudas');
  return data;
};

// ── SESIONES DE GASTOS (múltiples pagadores en un mismo gasto) ─
export const updateExpenseSession = async ({ session_id, group_id, description, date, payers }) => {
  // Actualizar descripción y fecha en todos los sub-gastos de la sesión
  const updates = payers.map(async ({ expense_id, amount }) => {
    return supabase
      .from('expenses')
      .update({ description, date, amount })
      .eq('expense_id', expense_id)
      .eq('group_id', group_id);
  });
  const results = await Promise.all(updates);
  const errorResult = results.find((r) => r.error);
  return handleResponse({ success: true }, errorResult?.error, 'Error al actualizar sesión');
};

export const deleteExpenseSession = async (sessionId, groupId) => {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('session_id', sessionId)
    .eq('group_id', groupId);
  return handleResponse({ success: true }, error, 'Error al eliminar sesión');
};
