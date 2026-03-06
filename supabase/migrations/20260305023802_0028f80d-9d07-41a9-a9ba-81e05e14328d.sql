-- Fix existing person_transactions: infer type from amount sign
-- Positive amounts = divida_pessoa (person owes user)
-- Negative amounts with description containing 'Pagamento' = pagamento
-- Negative amounts without 'Pagamento' = divida_minha (user owes person)

UPDATE public.person_transactions
SET type = 'pagamento'
WHERE amount < 0 AND (description ILIKE '%pagamento%' OR description ILIKE '%pagamento recebido%');

UPDATE public.person_transactions
SET type = 'divida_minha'
WHERE amount < 0 AND type = 'divida_pessoa';

-- Ensure positive amounts are divida_pessoa (should already be correct)
UPDATE public.person_transactions
SET type = 'divida_pessoa'
WHERE amount > 0 AND type != 'divida_pessoa';