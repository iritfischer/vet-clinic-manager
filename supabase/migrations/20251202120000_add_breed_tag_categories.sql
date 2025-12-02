-- Add breed tag categories to the CHECK constraint
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
  'medical_history',
  'breed_dog',
  'breed_cat',
  'breed_other'
));

-- Seed default dog breeds for existing clinics
DO $$
DECLARE
  clinic_rec RECORD;
BEGIN
  FOR clinic_rec IN SELECT id FROM public.clinics LOOP
    -- Dog Breeds
    INSERT INTO public.tags (clinic_id, category, value, label, sort_order) VALUES
      (clinic_rec.id, 'breed_dog', 'mixed', 'מעורב', 1),
      (clinic_rec.id, 'breed_dog', 'labrador', 'לברדור', 2),
      (clinic_rec.id, 'breed_dog', 'golden_retriever', 'גולדן רטריבר', 3),
      (clinic_rec.id, 'breed_dog', 'german_shepherd', 'רועה גרמני', 4),
      (clinic_rec.id, 'breed_dog', 'poodle', 'פודל', 5),
      (clinic_rec.id, 'breed_dog', 'bulldog', 'בולדוג', 6),
      (clinic_rec.id, 'breed_dog', 'beagle', 'ביגל', 7),
      (clinic_rec.id, 'breed_dog', 'husky', 'האסקי', 8),
      (clinic_rec.id, 'breed_dog', 'yorkshire', 'יורקשייר', 9),
      (clinic_rec.id, 'breed_dog', 'chihuahua', 'צ׳יוואווה', 10),
      (clinic_rec.id, 'breed_dog', 'shih_tzu', 'שיצו', 11),
      (clinic_rec.id, 'breed_dog', 'maltese', 'מלטז', 12),
      (clinic_rec.id, 'breed_dog', 'pomeranian', 'פומרניאן', 13),
      (clinic_rec.id, 'breed_dog', 'rottweiler', 'רוטווילר', 14),
      (clinic_rec.id, 'breed_dog', 'boxer', 'בוקסר', 15),
      (clinic_rec.id, 'breed_dog', 'dachshund', 'דקסהונד (נקניקייה)', 16),
      (clinic_rec.id, 'breed_dog', 'schnauzer', 'שנאוצר', 17),
      (clinic_rec.id, 'breed_dog', 'cocker_spaniel', 'קוקר ספניאל', 18),
      (clinic_rec.id, 'breed_dog', 'border_collie', 'בורדר קולי', 19),
      (clinic_rec.id, 'breed_dog', 'pitbull', 'פיטבול', 20),
      (clinic_rec.id, 'breed_dog', 'canaan', 'כנעני', 21),
      (clinic_rec.id, 'breed_dog', 'other', 'אחר', 99)
    ON CONFLICT (clinic_id, category, value) DO NOTHING;

    -- Cat Breeds
    INSERT INTO public.tags (clinic_id, category, value, label, sort_order) VALUES
      (clinic_rec.id, 'breed_cat', 'mixed', 'מעורב', 1),
      (clinic_rec.id, 'breed_cat', 'persian', 'פרסי', 2),
      (clinic_rec.id, 'breed_cat', 'siamese', 'סיאמי', 3),
      (clinic_rec.id, 'breed_cat', 'maine_coon', 'מיין קון', 4),
      (clinic_rec.id, 'breed_cat', 'british_shorthair', 'בריטי קצר שיער', 5),
      (clinic_rec.id, 'breed_cat', 'ragdoll', 'רגדול', 6),
      (clinic_rec.id, 'breed_cat', 'bengal', 'בנגלי', 7),
      (clinic_rec.id, 'breed_cat', 'abyssinian', 'אביסיני', 8),
      (clinic_rec.id, 'breed_cat', 'scottish_fold', 'סקוטיש פולד', 9),
      (clinic_rec.id, 'breed_cat', 'sphynx', 'ספינקס', 10),
      (clinic_rec.id, 'breed_cat', 'russian_blue', 'רוסי כחול', 11),
      (clinic_rec.id, 'breed_cat', 'street', 'חתול רחוב', 12),
      (clinic_rec.id, 'breed_cat', 'other', 'אחר', 99)
    ON CONFLICT (clinic_id, category, value) DO NOTHING;

    -- Other animal breeds (general)
    INSERT INTO public.tags (clinic_id, category, value, label, sort_order) VALUES
      (clinic_rec.id, 'breed_other', 'rabbit', 'ארנב', 1),
      (clinic_rec.id, 'breed_other', 'hamster', 'אוגר', 2),
      (clinic_rec.id, 'breed_other', 'guinea_pig', 'שרקן', 3),
      (clinic_rec.id, 'breed_other', 'parrot', 'תוכי', 4),
      (clinic_rec.id, 'breed_other', 'turtle', 'צב', 5),
      (clinic_rec.id, 'breed_other', 'fish', 'דג', 6),
      (clinic_rec.id, 'breed_other', 'snake', 'נחש', 7),
      (clinic_rec.id, 'breed_other', 'lizard', 'לטאה', 8),
      (clinic_rec.id, 'breed_other', 'ferret', 'חמוס', 9),
      (clinic_rec.id, 'breed_other', 'horse', 'סוס', 10),
      (clinic_rec.id, 'breed_other', 'other', 'אחר', 99)
    ON CONFLICT (clinic_id, category, value) DO NOTHING;

  END LOOP;
END $$;
