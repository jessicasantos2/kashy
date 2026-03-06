
-- Function to calculate balance for a single company account
CREATE OR REPLACE FUNCTION public.calculate_company_account_balance(p_account_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    COALESCE(ca.balance, 0) +
    COALESCE(SUM(CASE WHEN ce.type = 'revenue' THEN ce.amount ELSE -ce.amount END), 0)
  FROM public.company_accounts ca
  LEFT JOIN public.company_entries ce ON ce.company_account_id = ca.id
  WHERE ca.id = p_account_id
  GROUP BY ca.balance;
$$;

-- Function to calculate balances for all accounts of a user
CREATE OR REPLACE FUNCTION public.calculate_all_company_balances(p_user_id UUID)
RETURNS TABLE(account_id UUID, calculated_balance NUMERIC)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    ca.id AS account_id,
    ca.balance + COALESCE(SUM(CASE WHEN ce.type = 'revenue' THEN ce.amount ELSE -ce.amount END), 0) AS calculated_balance
  FROM public.company_accounts ca
  LEFT JOIN public.company_entries ce ON ce.company_account_id = ca.id
  WHERE ca.user_id = p_user_id
  GROUP BY ca.id, ca.balance;
$$;

-- Make company_account_id NOT NULL for new entries
ALTER TABLE public.company_entries
ALTER COLUMN company_account_id SET NOT NULL;
