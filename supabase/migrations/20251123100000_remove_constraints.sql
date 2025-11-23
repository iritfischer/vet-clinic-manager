-- Remove restrictive check constraints to allow free-form values
ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_species_check;
ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_sex_check;
ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_neuter_status_check;
ALTER TABLE public.reminders DROP CONSTRAINT IF EXISTS reminders_reminder_type_check;
