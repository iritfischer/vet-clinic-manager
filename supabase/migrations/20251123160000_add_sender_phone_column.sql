-- Add sender_phone column to whatsapp_messages for tracking incoming messages
-- This helps identify senders even when no client match is found
ALTER TABLE IF EXISTS public.whatsapp_messages
ADD COLUMN IF NOT EXISTS sender_phone TEXT;

-- Add policy to allow service role (webhook) to insert messages
-- Service role bypasses RLS by default, but we need to ensure webhook can work
-- even if there's no authenticated user context

-- Create a policy that allows inserts from service role context
DROP POLICY IF EXISTS "Allow service role to insert messages" ON public.whatsapp_messages;
CREATE POLICY "Allow service role to insert messages"
ON public.whatsapp_messages
FOR INSERT
WITH CHECK (true);

-- Drop the old restrictive insert policy and recreate it to be more permissive
DROP POLICY IF EXISTS "Users can insert whatsapp messages for their clinic" ON public.whatsapp_messages;
CREATE POLICY "Users can insert whatsapp messages for their clinic"
ON public.whatsapp_messages
FOR INSERT
WITH CHECK (
  clinic_id IN (
    SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
  )
  OR auth.uid() IS NULL -- Allow webhook insertions (service role)
);
