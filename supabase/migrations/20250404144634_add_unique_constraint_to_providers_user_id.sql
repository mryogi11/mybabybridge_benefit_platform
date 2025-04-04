ALTER TABLE public.providers
ADD CONSTRAINT providers_user_id_unique UNIQUE (user_id);
