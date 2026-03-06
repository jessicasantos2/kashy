
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS transaction_group_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS installment_number integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS total_installments integer DEFAULT NULL;
