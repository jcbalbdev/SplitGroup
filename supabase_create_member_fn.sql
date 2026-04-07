-- Función para crear un usuario directamente en auth.users (sin emails, instantáneo)
CREATE OR REPLACE FUNCTION public.create_member_and_add_to_group(
  p_email    TEXT,
  p_password TEXT,
  p_group_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_exists  BOOLEAN;
BEGIN
  -- Ver si el usuario ya existe en auth
  SELECT id INTO v_user_id FROM auth.users WHERE email = lower(p_email) LIMIT 1;
  v_exists := v_user_id IS NOT NULL;

  -- Si no existe, crearlo directamente
  IF NOT v_exists THEN
    v_user_id := extensions.uuid_generate_v4();

    INSERT INTO auth.users (
      instance_id, id, aud, role,
      email, encrypted_password,
      email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      lower(p_email),
      extensions.crypt(p_password, extensions.gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(), NOW(),
      '', '', '', ''
    );
  END IF;

  -- Asegurar que exista el perfil vinculado
  INSERT INTO public.profiles (email, name, auth_id)
  VALUES (lower(p_email), split_part(lower(p_email), '@', 1), v_user_id)
  ON CONFLICT (email) DO UPDATE SET auth_id = EXCLUDED.auth_id;

  -- Añadir al grupo (ignorar duplicado)
  INSERT INTO public.group_members (group_id, user_email)
  VALUES (p_group_id, lower(p_email))
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'already_existed', v_exists
  );
END;
$$;

-- Permitir que usuarios autenticados llamen a esta función
GRANT EXECUTE ON FUNCTION public.create_member_and_add_to_group(TEXT, TEXT, UUID) TO authenticated;
