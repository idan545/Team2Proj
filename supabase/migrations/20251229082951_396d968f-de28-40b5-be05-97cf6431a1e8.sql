-- Add presentation_url column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS presentation_url TEXT;

-- Create storage bucket for presentations
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('presentations', 'presentations', true, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to view presentations
CREATE POLICY "Anyone can view presentations"
ON storage.objects
FOR SELECT
USING (bucket_id = 'presentations');

-- Allow students to upload their own presentations
CREATE POLICY "Students can upload presentations"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'presentations' 
  AND auth.role() = 'authenticated'
);

-- Allow students to update their presentations
CREATE POLICY "Students can update own presentations"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'presentations'
  AND auth.role() = 'authenticated'
);

-- Allow students to delete their presentations
CREATE POLICY "Students can delete own presentations"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'presentations'
  AND auth.role() = 'authenticated'
);