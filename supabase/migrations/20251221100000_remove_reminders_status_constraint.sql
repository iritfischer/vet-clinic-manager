-- Remove restrictive status check constraint from reminders table
-- to allow custom status values like 'pending'
ALTER TABLE public.reminders DROP CONSTRAINT IF EXISTS reminders_status_check;
