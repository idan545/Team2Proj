-- Add expertise_areas column to conferences table
ALTER TABLE public.conferences 
ADD COLUMN expertise_areas text[] DEFAULT '{}'::text[];