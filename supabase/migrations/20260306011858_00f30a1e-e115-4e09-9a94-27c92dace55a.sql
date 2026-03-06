ALTER TABLE public.company_entries ADD COLUMN category text NOT NULL DEFAULT 'Outros';
NOTIFY pgrst, 'reload schema';