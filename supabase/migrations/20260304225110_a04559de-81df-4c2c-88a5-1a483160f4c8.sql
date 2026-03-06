ALTER TABLE public.person_transactions ADD COLUMN paid boolean NOT NULL DEFAULT false;
ALTER TABLE public.card_charges ADD COLUMN paid boolean NOT NULL DEFAULT false;