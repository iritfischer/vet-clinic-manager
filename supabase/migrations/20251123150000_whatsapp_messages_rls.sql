-- Enable RLS on whatsapp_messages if not already enabled
ALTER TABLE IF EXISTS public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view whatsapp messages from their clinic" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Users can insert whatsapp messages for their clinic" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Users can update whatsapp messages from their clinic" ON public.whatsapp_messages;

-- Create RLS policies for whatsapp_messages
CREATE POLICY "Users can view whatsapp messages from their clinic"
ON public.whatsapp_messages
FOR SELECT
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert whatsapp messages for their clinic"
ON public.whatsapp_messages
FOR INSERT
WITH CHECK (
  clinic_id IN (
    SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update whatsapp messages from their clinic"
ON public.whatsapp_messages
FOR UPDATE
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Enable realtime for whatsapp_messages
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;
