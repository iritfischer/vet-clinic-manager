-- Add pricing fields to vaccinations table
ALTER TABLE public.vaccinations
ADD COLUMN IF NOT EXISTS price_without_vat DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS price_with_vat DECIMAL(10, 2);

-- Add comment to explain the fields
COMMENT ON COLUMN public.vaccinations.price_without_vat IS 'מחיר ללא מע״מ - אופציונלי';
COMMENT ON COLUMN public.vaccinations.price_with_vat IS 'מחיר כולל מע״מ - אופציונלי';

