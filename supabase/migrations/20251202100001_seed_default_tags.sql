-- Seed default tags for existing clinics
-- This copies the hardcoded values from the application code as default tags

DO $$
DECLARE
  clinic_rec RECORD;
BEGIN
  FOR clinic_rec IN SELECT id FROM public.clinics LOOP
    -- Visit Types (from VISIT_TYPES in VisitForm.tsx)
    INSERT INTO public.tags (clinic_id, category, value, label, sort_order) VALUES
      (clinic_rec.id, 'visit_type', 'checkup', 'בדיקה כללית', 1),
      (clinic_rec.id, 'visit_type', 'vaccination', 'חיסון', 2),
      (clinic_rec.id, 'visit_type', 'surgery', 'ניתוח', 3),
      (clinic_rec.id, 'visit_type', 'dental', 'טיפול שיניים', 4),
      (clinic_rec.id, 'visit_type', 'emergency', 'חירום', 5),
      (clinic_rec.id, 'visit_type', 'grooming', 'טיפוח', 6),
      (clinic_rec.id, 'visit_type', 'other', 'אחר', 7)
    ON CONFLICT (clinic_id, category, value) DO NOTHING;

    -- Reminder Types (from reminderTypeLabels in Reminders.tsx)
    INSERT INTO public.tags (clinic_id, category, value, label, sort_order) VALUES
      (clinic_rec.id, 'reminder_type', 'follow_up', 'בדיקת מעקב', 1),
      (clinic_rec.id, 'reminder_type', 'vaccination', 'חיסון', 2),
      (clinic_rec.id, 'reminder_type', 'medication', 'תרופות', 3),
      (clinic_rec.id, 'reminder_type', 'test_results', 'תוצאות בדיקה', 4),
      (clinic_rec.id, 'reminder_type', 'general', 'כללי', 5)
    ON CONFLICT (clinic_id, category, value) DO NOTHING;

    -- Appointment Types (common defaults)
    INSERT INTO public.tags (clinic_id, category, value, label, sort_order) VALUES
      (clinic_rec.id, 'appointment_type', 'checkup', 'בדיקה שגרתית', 1),
      (clinic_rec.id, 'appointment_type', 'vaccination', 'חיסון', 2),
      (clinic_rec.id, 'appointment_type', 'surgery', 'ניתוח', 3),
      (clinic_rec.id, 'appointment_type', 'consultation', 'ייעוץ', 4),
      (clinic_rec.id, 'appointment_type', 'emergency', 'חירום', 5),
      (clinic_rec.id, 'appointment_type', 'grooming', 'טיפוח', 6)
    ON CONFLICT (clinic_id, category, value) DO NOTHING;

    -- Common Diagnoses (veterinary defaults)
    INSERT INTO public.tags (clinic_id, category, value, label, sort_order) VALUES
      (clinic_rec.id, 'diagnosis', 'healthy', 'בריא', 1),
      (clinic_rec.id, 'diagnosis', 'infection', 'זיהום', 2),
      (clinic_rec.id, 'diagnosis', 'allergy', 'אלרגיה', 3),
      (clinic_rec.id, 'diagnosis', 'skin_condition', 'בעיית עור', 4),
      (clinic_rec.id, 'diagnosis', 'digestive', 'בעיית עיכול', 5),
      (clinic_rec.id, 'diagnosis', 'dental', 'בעיית שיניים', 6),
      (clinic_rec.id, 'diagnosis', 'orthopedic', 'בעיה אורתופדית', 7),
      (clinic_rec.id, 'diagnosis', 'ear_infection', 'דלקת אוזניים', 8)
    ON CONFLICT (clinic_id, category, value) DO NOTHING;

    -- Common Treatments (veterinary defaults)
    INSERT INTO public.tags (clinic_id, category, value, label, sort_order) VALUES
      (clinic_rec.id, 'treatment', 'antibiotics', 'אנטיביוטיקה', 1),
      (clinic_rec.id, 'treatment', 'pain_relief', 'משככי כאבים', 2),
      (clinic_rec.id, 'treatment', 'anti_inflammatory', 'נוגד דלקת', 3),
      (clinic_rec.id, 'treatment', 'fluids', 'עירוי נוזלים', 4),
      (clinic_rec.id, 'treatment', 'wound_care', 'טיפול בפצע', 5),
      (clinic_rec.id, 'treatment', 'dental_cleaning', 'ניקוי שיניים', 6),
      (clinic_rec.id, 'treatment', 'surgery', 'ניתוח', 7),
      (clinic_rec.id, 'treatment', 'vaccination', 'חיסון', 8)
    ON CONFLICT (clinic_id, category, value) DO NOTHING;

    -- Common Medications (veterinary defaults)
    INSERT INTO public.tags (clinic_id, category, value, label, sort_order) VALUES
      (clinic_rec.id, 'medication', 'amoxicillin', 'אמוקסיצילין', 1),
      (clinic_rec.id, 'medication', 'metronidazole', 'מטרונידזול', 2),
      (clinic_rec.id, 'medication', 'rimadyl', 'רימדיל', 3),
      (clinic_rec.id, 'medication', 'prednisone', 'פרדניזון', 4),
      (clinic_rec.id, 'medication', 'apoquel', 'אפוקוול', 5),
      (clinic_rec.id, 'medication', 'frontline', 'פרונטליין', 6),
      (clinic_rec.id, 'medication', 'heartgard', 'הארטגארד', 7)
    ON CONFLICT (clinic_id, category, value) DO NOTHING;

  END LOOP;
END $$;
