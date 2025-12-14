-- Add vaccinations column to visits table
ALTER TABLE public.visits
ADD COLUMN IF NOT EXISTS vaccinations JSONB DEFAULT '[]'::jsonb;

