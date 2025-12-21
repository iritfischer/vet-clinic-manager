-- Add 'lost' status to pets table and remove constraint
-- This allows pets to have status: active, lost, deceased

-- First drop the existing constraint
ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_status_check;

-- Add new constraint with lost status
ALTER TABLE public.pets ADD CONSTRAINT pets_status_check
  CHECK (status IN ('active', 'lost', 'deceased', 'transferred'));
