-- Remove restrictive check constraints from visits table
-- These constraints are too limiting for the application's needs

-- Remove visit_type constraint to allow custom types like 'vaccination:rabies'
ALTER TABLE public.visits DROP CONSTRAINT IF EXISTS visits_visit_type_check;

-- Remove status constraint to allow 'completed', 'cancelled' etc.
ALTER TABLE public.visits DROP CONSTRAINT IF EXISTS visits_status_check;
