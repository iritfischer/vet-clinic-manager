-- Add more tag categories to the CHECK constraint
ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS tags_category_check;

ALTER TABLE public.tags ADD CONSTRAINT tags_category_check CHECK (category IN (
  'visit_type',
  'diagnosis',
  'treatment',
  'medication',
  'reminder_type',
  'appointment_type',
  'price_category',
  'vaccination_type',
  'chief_complaint',
  'medical_history'
));

-- Seed default tags for the new categories for existing clinics
DO $$
DECLARE
  clinic_rec RECORD;
BEGIN
  FOR clinic_rec IN SELECT id FROM public.clinics LOOP
    -- Price Categories (from PriceItemDialog.tsx)
    INSERT INTO public.tags (clinic_id, category, value, label, sort_order) VALUES
      (clinic_rec.id, 'price_category', 'consultation', 'ייעוץ', 1),
      (clinic_rec.id, 'price_category', 'surgery', 'ניתוחים', 2),
      (clinic_rec.id, 'price_category', 'vaccination', 'חיסונים', 3),
      (clinic_rec.id, 'price_category', 'medication', 'תרופות', 4),
      (clinic_rec.id, 'price_category', 'treatment', 'טיפולים', 5),
      (clinic_rec.id, 'price_category', 'diagnostic', 'אבחון', 6),
      (clinic_rec.id, 'price_category', 'lab', 'מעבדה', 7),
      (clinic_rec.id, 'price_category', 'imaging', 'הדמיה', 8),
      (clinic_rec.id, 'price_category', 'hospitalization', 'אשפוז', 9),
      (clinic_rec.id, 'price_category', 'grooming', 'טיפוח', 10),
      (clinic_rec.id, 'price_category', 'food', 'מזון', 11),
      (clinic_rec.id, 'price_category', 'supplies', 'ציוד', 12),
      (clinic_rec.id, 'price_category', 'other', 'אחר', 99)
    ON CONFLICT (clinic_id, category, value) DO NOTHING;

    -- Vaccination Types - Dogs (from VisitForm.tsx VACCINATION_TYPES)
    INSERT INTO public.tags (clinic_id, category, value, label, description, sort_order) VALUES
      (clinic_rec.id, 'vaccination_type', 'rabies', 'כלבת', 'חיסון שנתי - כלבים וחתולים', 1),
      (clinic_rec.id, 'vaccination_type', 'dhpp', 'משושה (DHPP)', 'כלבים - שנתי', 2),
      (clinic_rec.id, 'vaccination_type', 'leptospirosis', 'לפטוספירוזיס', 'כלבים - שנתי', 3),
      (clinic_rec.id, 'vaccination_type', 'bordetella', 'בורדטלה (שיעול מלונות)', 'כלבים - כל 6 חודשים', 4),
      (clinic_rec.id, 'vaccination_type', 'lyme', 'ליים', 'כלבים - שנתי', 5),
      (clinic_rec.id, 'vaccination_type', 'fvrcp', 'משולש (FVRCP)', 'חתולים - שנתי', 6),
      (clinic_rec.id, 'vaccination_type', 'felv', 'לויקמיה (FeLV)', 'חתולים - שנתי', 7),
      (clinic_rec.id, 'vaccination_type', 'fiv', 'איידס חתולים (FIV)', 'חתולים - שנתי', 8),
      (clinic_rec.id, 'vaccination_type', 'other', 'אחר', NULL, 99)
    ON CONFLICT (clinic_id, category, value) DO NOTHING;

    -- Chief Complaints (common veterinary complaints)
    INSERT INTO public.tags (clinic_id, category, value, label, sort_order) VALUES
      (clinic_rec.id, 'chief_complaint', 'vomiting', 'הקאות', 1),
      (clinic_rec.id, 'chief_complaint', 'diarrhea', 'שלשול', 2),
      (clinic_rec.id, 'chief_complaint', 'not_eating', 'לא אוכל', 3),
      (clinic_rec.id, 'chief_complaint', 'lethargy', 'חולשה/עייפות', 4),
      (clinic_rec.id, 'chief_complaint', 'limping', 'צליעה', 5),
      (clinic_rec.id, 'chief_complaint', 'itching', 'גירוד', 6),
      (clinic_rec.id, 'chief_complaint', 'hair_loss', 'נשירת שיער', 7),
      (clinic_rec.id, 'chief_complaint', 'coughing', 'שיעול', 8),
      (clinic_rec.id, 'chief_complaint', 'sneezing', 'עיטוש', 9),
      (clinic_rec.id, 'chief_complaint', 'eye_discharge', 'הפרשה מהעיניים', 10),
      (clinic_rec.id, 'chief_complaint', 'ear_problem', 'בעיה באוזניים', 11),
      (clinic_rec.id, 'chief_complaint', 'skin_lesion', 'נגע בעור', 12),
      (clinic_rec.id, 'chief_complaint', 'lump', 'גוש/נפיחות', 13),
      (clinic_rec.id, 'chief_complaint', 'urination_problem', 'בעיית השתנה', 14),
      (clinic_rec.id, 'chief_complaint', 'weight_loss', 'ירידה במשקל', 15),
      (clinic_rec.id, 'chief_complaint', 'checkup', 'בדיקה שגרתית', 16),
      (clinic_rec.id, 'chief_complaint', 'vaccination', 'חיסון', 17),
      (clinic_rec.id, 'chief_complaint', 'other', 'אחר', 99)
    ON CONFLICT (clinic_id, category, value) DO NOTHING;

    -- Medical History (common conditions)
    INSERT INTO public.tags (clinic_id, category, value, label, sort_order) VALUES
      (clinic_rec.id, 'medical_history', 'allergies', 'אלרגיות', 1),
      (clinic_rec.id, 'medical_history', 'heart_disease', 'מחלת לב', 2),
      (clinic_rec.id, 'medical_history', 'kidney_disease', 'מחלת כליות', 3),
      (clinic_rec.id, 'medical_history', 'liver_disease', 'מחלת כבד', 4),
      (clinic_rec.id, 'medical_history', 'diabetes', 'סוכרת', 5),
      (clinic_rec.id, 'medical_history', 'epilepsy', 'אפילפסיה', 6),
      (clinic_rec.id, 'medical_history', 'cancer', 'סרטן', 7),
      (clinic_rec.id, 'medical_history', 'arthritis', 'דלקת מפרקים', 8),
      (clinic_rec.id, 'medical_history', 'hypothyroidism', 'תת-פעילות בלוטת התריס', 9),
      (clinic_rec.id, 'medical_history', 'hyperthyroidism', 'יתר-פעילות בלוטת התריס', 10),
      (clinic_rec.id, 'medical_history', 'previous_surgery', 'ניתוח קודם', 11),
      (clinic_rec.id, 'medical_history', 'chronic_medication', 'תרופות כרוניות', 12),
      (clinic_rec.id, 'medical_history', 'none', 'ללא רקע מיוחד', 99)
    ON CONFLICT (clinic_id, category, value) DO NOTHING;

  END LOOP;
END $$;
