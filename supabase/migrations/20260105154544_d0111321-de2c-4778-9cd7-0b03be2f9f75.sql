-- Add created_by column to conferences to track who created the conference
ALTER TABLE public.conferences 
ADD COLUMN created_by uuid REFERENCES auth.users(id);

-- Update existing conferences to set created_by to null (will be set on new creations)
-- No need to update existing data