-- Migration to fix vaccinations not being created for new clinics
-- The original migration only seeded vaccinations for existing clinics at the time of migration
-- This migration adds a trigger to create default vaccinations for new clinics

-- Create function to seed default vaccinations for a clinic
CREATE OR REPLACE FUNCTION public.seed_default_vaccinations(p_clinic_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Dog vaccinations
  INSERT INTO public.vaccinations (clinic_id, name, label, species, interval_days, description, sort_order) VALUES
    (p_clinic_id, 'rabies', 'כלבת', 'dog', 365, 'חיסון שנתי - כלבים', 1),
    (p_clinic_id, 'dhpp', 'משושה (DHPP)', 'dog', 365, 'כלבים - שנתי', 2),
    (p_clinic_id, 'leptospirosis', 'לפטוספירוזיס', 'dog', 365, 'כלבים - שנתי', 3),
    (p_clinic_id, 'bordetella', 'בורדטלה (שיעול מלונות)', 'dog', 180, 'כלבים - כל 6 חודשים', 4),
    (p_clinic_id, 'lyme', 'ליים', 'dog', 365, 'כלבים - שנתי', 5)
  ON CONFLICT (clinic_id, name, species) DO NOTHING;

  -- Cat vaccinations
  INSERT INTO public.vaccinations (clinic_id, name, label, species, interval_days, description, sort_order) VALUES
    (p_clinic_id, 'rabies', 'כלבת', 'cat', 365, 'חיסון שנתי - חתולים', 1),
    (p_clinic_id, 'fvrcp', 'משולש (FVRCP)', 'cat', 365, 'חתולים - שנתי', 2),
    (p_clinic_id, 'felv', 'לויקמיה (FeLV)', 'cat', 365, 'חתולים - שנתי', 3),
    (p_clinic_id, 'fiv', 'איידס חתולים (FIV)', 'cat', 365, 'חתולים - שנתי', 4)
  ON CONFLICT (clinic_id, name, species) DO NOTHING;

  -- Other animals vaccinations
  INSERT INTO public.vaccinations (clinic_id, name, label, species, interval_days, description, sort_order) VALUES
    (p_clinic_id, 'rabies', 'כלבת', 'other', 365, 'חיסון שנתי - בעלי חיים אחרים', 1),
    (p_clinic_id, 'other', 'אחר', 'other', 365, 'חיסון כללי', 99)
  ON CONFLICT (clinic_id, name, species) DO NOTHING;
END;
$$;

-- Create trigger function to create default vaccinations when a new clinic is created
CREATE OR REPLACE FUNCTION public.trigger_seed_vaccinations_for_new_clinic()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.seed_default_vaccinations(NEW.id);
  RETURN NEW;
END;
$$;

-- Create trigger on clinics table
DROP TRIGGER IF EXISTS seed_vaccinations_on_clinic_create ON public.clinics;
CREATE TRIGGER seed_vaccinations_on_clinic_create
  AFTER INSERT ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.trigger_seed_vaccinations_for_new_clinic();

-- Seed vaccinations for any existing clinics that don't have any vaccinations yet
DO $$
DECLARE
  clinic_rec RECORD;
BEGIN
  FOR clinic_rec IN
    SELECT c.id
    FROM public.clinics c
    WHERE NOT EXISTS (
      SELECT 1 FROM public.vaccinations v WHERE v.clinic_id = c.id
    )
  LOOP
    PERFORM public.seed_default_vaccinations(clinic_rec.id);
  END LOOP;
END $$;
