-- Create a demo user for campaign access. Delete later by removing this user from Cloud > Users.
DO $$
DECLARE
  demo_user_id uuid;
BEGIN
  -- Skip if already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'demo@dailydominator.org') THEN
    RETURN;
  END IF;

  demo_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token,
    email_change, email_change_token_new, recovery_token
  ) VALUES (
    demo_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'demo@dailydominator.org',
    crypt('Demo!Access2026', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Demo User"}'::jsonb,
    false, '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), demo_user_id,
    jsonb_build_object('sub', demo_user_id::text, 'email', 'demo@dailydominator.org'),
    'email', demo_user_id::text, now(), now(), now()
  );
END $$;