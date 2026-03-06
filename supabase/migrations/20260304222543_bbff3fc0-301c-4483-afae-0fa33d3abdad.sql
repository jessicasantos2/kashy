
INSERT INTO public.card_charges (card_id, user_id, date, description, value, installments)
SELECT cc.id, t.user_id, t.date, t.description, t.value,
  CASE 
    WHEN t.installment_number IS NOT NULL AND t.total_installments IS NOT NULL 
    THEN t.installment_number || '/' || t.total_installments
    ELSE '1/1'
  END
FROM public.transactions t
JOIN public.credit_cards cc ON cc.name = t.card AND cc.user_id = t.user_id
WHERE t.card IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.card_charges ch 
  WHERE ch.card_id = cc.id 
  AND ch.date = t.date 
  AND ch.description = t.description 
  AND ch.value = t.value
  AND ch.user_id = t.user_id
);
