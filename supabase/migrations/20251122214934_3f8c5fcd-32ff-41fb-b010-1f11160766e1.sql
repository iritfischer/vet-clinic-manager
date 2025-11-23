-- Remove the check constraint on visit_type to allow free-form visit types
ALTER TABLE public.visits DROP CONSTRAINT IF EXISTS visits_visit_type_check;