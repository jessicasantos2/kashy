
ALTER TABLE public.company_entries
ADD COLUMN IF NOT EXISTS company_account_id UUID REFERENCES public.company_accounts(id) ON DELETE SET NULL;
