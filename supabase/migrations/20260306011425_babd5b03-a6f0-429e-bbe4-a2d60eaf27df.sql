
CREATE TABLE public.company_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'revenue' CHECK (type IN ('revenue', 'expense')),
  date date NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.company_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own company_entries"
  ON public.company_entries FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_company_entries_updated_at
  BEFORE UPDATE ON public.company_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
