
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-bank-logos', 'company-bank-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload company bank logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-bank-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own company bank logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'company-bank-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own company bank logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'company-bank-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view company bank logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-bank-logos');
