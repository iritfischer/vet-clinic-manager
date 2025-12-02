-- Create tags table for clinic-specific tag management
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'visit_type',
    'diagnosis',
    'treatment',
    'medication',
    'reminder_type',
    'appointment_type'
  )),
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_tag_per_clinic UNIQUE (clinic_id, category, value)
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tags_clinic_id ON public.tags(clinic_id);
CREATE INDEX IF NOT EXISTS idx_tags_category ON public.tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_clinic_category ON public.tags(clinic_id, category);
CREATE INDEX IF NOT EXISTS idx_tags_is_active ON public.tags(is_active);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view tags from their clinic"
ON public.tags
FOR SELECT
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert tags for their clinic"
ON public.tags
FOR INSERT
WITH CHECK (
  clinic_id IN (
    SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update tags from their clinic"
ON public.tags
FOR UPDATE
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete tags from their clinic"
ON public.tags
FOR DELETE
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_tags_updated_at ON public.tags;
CREATE TRIGGER update_tags_updated_at
    BEFORE UPDATE ON public.tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to increment tag usage count
CREATE OR REPLACE FUNCTION increment_tag_usage(tag_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.tags
  SET usage_count = usage_count + 1,
      updated_at = now()
  WHERE id = tag_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for tags
ALTER PUBLICATION supabase_realtime ADD TABLE tags;
