
INSERT INTO public.person_transactions (person_id, user_id, date, description, amount)
SELECT p.id, t.user_id, t.date, t.description, t.value
FROM public.transactions t
JOIN public.people p ON p.name = t.person AND p.user_id = t.user_id
WHERE t.person IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.person_transactions pt
  WHERE pt.person_id = p.id AND pt.date = t.date AND pt.description = t.description AND pt.amount = t.value AND pt.user_id = t.user_id
);
