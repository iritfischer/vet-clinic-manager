-- Create vaccinations table
CREATE TABLE public.vaccinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  label TEXT NOT NULL, -- שם בעברית לתצוגה
  species TEXT NOT NULL CHECK (species IN ('dog', 'cat', 'other', 'all')),
  interval_days INTEGER NOT NULL, -- מספר ימים בין חיסונים
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, name, species)
);

-- Create index for better performance
CREATE INDEX idx_vaccinations_clinic_species_active ON public.vaccinations(clinic_id, species, is_active);

-- Enable RLS
ALTER TABLE public.vaccinations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view vaccinations in their clinic"
ON public.vaccinations FOR SELECT
TO authenticated
USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Staff can manage vaccinations in their clinic"
ON public.vaccinations FOR ALL
TO authenticated
USING (clinic_id = public.get_user_clinic_id(auth.uid()));

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_vaccinations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_vaccinations_updated_at
  BEFORE UPDATE ON public.vaccinations
  FOR EACH ROW EXECUTE FUNCTION public.update_vaccinations_updated_at();

-- Seed default vaccinations for existing clinics
-- העברת החיסונים מ-VACCINATION_TYPES הקשוח בקוד
DO $$
DECLARE
  clinic_rec RECORD;
BEGIN
  FOR clinic_rec IN SELECT id FROM public.clinics LOOP
    -- Dog vaccinations
    INSERT INTO public.vaccinations (clinic_id, name, label, species, interval_days, description, sort_order) VALUES
      (clinic_rec.id, 'rabies', 'כלבת', 'dog', 365, 'חיסון שנתי - כלבים', 1),
      (clinic_rec.id, 'dhpp', 'משושה (DHPP)', 'dog', 365, 'כלבים - שנתי', 2),
      (clinic_rec.id, 'leptospirosis', 'לפטוספירוזיס', 'dog', 365, 'כלבים - שנתי', 3),
      (clinic_rec.id, 'bordetella', 'בורדטלה (שיעול מלונות)', 'dog', 180, 'כלבים - כל 6 חודשים', 4),
      (clinic_rec.id, 'lyme', 'ליים', 'dog', 365, 'כלבים - שנתי', 5)
    ON CONFLICT (clinic_id, name, species) DO NOTHING;

    -- Cat vaccinations
    INSERT INTO public.vaccinations (clinic_id, name, label, species, interval_days, description, sort_order) VALUES
      (clinic_rec.id, 'rabies', 'כלבת', 'cat', 365, 'חיסון שנתי - חתולים', 1),
      (clinic_rec.id, 'fvrcp', 'משולש (FVRCP)', 'cat', 365, 'חתולים - שנתי', 2),
      (clinic_rec.id, 'felv', 'לויקמיה (FeLV)', 'cat', 365, 'חתולים - שנתי', 3),
      (clinic_rec.id, 'fiv', 'איידס חתולים (FIV)', 'cat', 365, 'חתולים - שנתי', 4)
    ON CONFLICT (clinic_id, name, species) DO NOTHING;

    -- Other animals vaccinations
    INSERT INTO public.vaccinations (clinic_id, name, label, species, interval_days, description, sort_order) VALUES
      (clinic_rec.id, 'rabies', 'כלבת', 'other', 365, 'חיסון שנתי - בעלי חיים אחרים', 1),
      (clinic_rec.id, 'other', 'אחר', 'other', 365, 'חיסון כללי', 99)
    ON CONFLICT (clinic_id, name, species) DO NOTHING;
  END LOOP;
END $$;

