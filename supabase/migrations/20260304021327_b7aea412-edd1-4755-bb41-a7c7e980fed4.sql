INSERT INTO public.user_roles (user_id, role)
VALUES ('2ff62e2a-7600-4425-97a8-327a94bfe758', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;