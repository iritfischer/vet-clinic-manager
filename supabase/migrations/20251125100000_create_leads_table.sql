-- Create leads table for managing potential clients from WhatsApp
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'lost')),
  source TEXT DEFAULT 'whatsapp',
  -- Optional pet info for quick capture
  pet_name TEXT,
  pet_species TEXT,
  pet_breed TEXT,
  pet_notes TEXT,
  -- Tracking conversion
  converted_client_id UUID REFERENCES public.clients(id),
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_leads_clinic_id ON public.leads(clinic_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view leads from their clinic"
ON public.leads
FOR SELECT
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert leads for their clinic"
ON public.leads
FOR INSERT
WITH CHECK (
  clinic_id IN (
    SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update leads from their clinic"
ON public.leads
FOR UPDATE
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete leads from their clinic"
ON public.leads
FOR DELETE
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Add lead_id column to whatsapp_messages for linking messages to leads
ALTER TABLE public.whatsapp_messages
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id);

-- Add index for lead_id in whatsapp_messages
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_lead_id ON public.whatsapp_messages(lead_id);

-- Enable realtime for leads
ALTER PUBLICATION supabase_realtime ADD TABLE leads;

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
