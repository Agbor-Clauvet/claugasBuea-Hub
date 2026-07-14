-- Grants the 'admin' role to a specific user by email.
-- Replace the email below with the account you want to use as admin.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'test2@test.com'
ON CONFLICT (user_id, role) DO NOTHING;
