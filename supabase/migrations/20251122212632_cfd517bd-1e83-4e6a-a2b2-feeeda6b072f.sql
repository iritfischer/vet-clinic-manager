-- Remove the restrictive check constraint on appointment_type
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_appointment_type_check;