// src/services/api/auth.js
// Funciones de autenticación.
import { supabase } from '../supabase';

const check = (error, msg) => {
  if (error) throw new Error(`${msg}: ${error.message}`);
};

export const sendMagicLink = async (email) => {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  check(error, 'Error enviando magic link');
  return { success: true };
};

export const registerUser = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  check(error, 'Error al registrar');
  if (!data.user) throw new Error('No se pudo crear la cuenta');
  return { email: data.user.email, name: data.user.email.split('@')[0], session: data.session };
};

export const verifyToken = async (email, token) => {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw new Error('Código incorrecto o expirado');
  return { email: data.user.email, name: data.user.email.split('@')[0] };
};

export const loginWithPassword = async (email, password) => {
  try { await supabase.auth.signOut(); } catch (_) {}
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  check(error, 'Error al iniciar sesión');
  return { email: data.user.email, name: data.user.email.split('@')[0] };
};

export const setPassword = async (email, newPassword) => {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  check(error, 'Error al actualizar contraseña');
  return { success: true };
};

export const resetPassword = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login`,
  });
  check(error, 'Error al enviar el correo de recuperación');
  return { success: true };
};

export const changePassword = async (email, currentPassword, newPassword) => {
  // Verificar contraseña actual sin cerrar sesión (signInWithPassword no hace signOut)
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (verifyError) throw new Error('La contraseña actual es incorrecta');

  // Ahora actualizar la contraseña
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  check(updateError, 'Error al actualizar contraseña');
  return { success: true };
};
