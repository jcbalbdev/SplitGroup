// src/services/api/groups.js
// Funciones de gestión de grupos.
import { supabase } from '../supabase';

const check = (error, msg) => {
  if (error) throw new Error(`${msg}: ${error.message}`);
};

export const getGroups = async (userEmail) => {
  const { data, error } = await supabase
    .from('group_members')
    .select('group_id, groups:group_id (name, created_by, created_at)')
    .eq('user_email', userEmail);

  check(error, 'Error al obtener grupos');

  const groupIds = data.map((d) => d.group_id);
  let memberMap = {};
  if (groupIds.length > 0) {
    const { data: allMembers } = await supabase
      .from('group_members')
      .select('group_id, user_email')
      .in('group_id', groupIds);
    (allMembers || []).forEach((row) => {
      if (!memberMap[row.group_id]) memberMap[row.group_id] = [];
      memberMap[row.group_id].push(row.user_email);
    });
  }

  return {
    groups: data.map((item) => ({
      group_id:     item.group_id,
      name:         item.groups?.name,
      created_by:   item.groups?.created_by,
      created_at:   item.groups?.created_at,
      memberCount:  (memberMap[item.group_id] || []).length,
      memberEmails: memberMap[item.group_id] || [],
    })),
  };
};

export const createGroup = async (name, createdBy) => {
  const { data: group, error } = await supabase
    .from('groups')
    .insert([{ name, created_by: createdBy }])
    .select()
    .single();

  check(error, 'Error al crear grupo');

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
  check(error, 'Error guardando apodo');
  return { success: true };
};

export const inviteAndCreateMember = async (groupId, email, password) => {
  const lowerEmail = email.toLowerCase().trim();
  const { error } = await supabase.rpc('create_member_and_add_to_group', {
    p_email:    lowerEmail,
    p_password: password,
    p_group_id: groupId,
  });
  check(error, 'Error al crear miembro');
  return { success: true };
};

export const inviteMember = inviteAndCreateMember;

export const deleteGroup = async (groupId) => {
  const { error } = await supabase.from('groups').delete().eq('group_id', groupId);
  check(error, 'Error al eliminar grupo');
  return { success: true };
};
