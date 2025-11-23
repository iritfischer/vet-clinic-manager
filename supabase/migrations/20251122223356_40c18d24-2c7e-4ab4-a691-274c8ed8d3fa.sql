-- Add missing fields to pets table for comprehensive pet management
ALTER TABLE public.pets
ADD COLUMN IF NOT EXISTS neuter_date DATE,
ADD COLUMN IF NOT EXISTS fee_exempt_reason TEXT,
ADD COLUMN IF NOT EXISTS microchip_date DATE,
ADD COLUMN IF NOT EXISTS enclosure_number TEXT,
ADD COLUMN IF NOT EXISTS blood_type TEXT,
ADD COLUMN IF NOT EXISTS price_list TEXT,
ADD COLUMN IF NOT EXISTS food_type TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS alert_note TEXT,
ADD COLUMN IF NOT EXISTS is_alert BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_allergies BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS inactive_reason TEXT,
ADD COLUMN IF NOT EXISTS last_file_sent_date DATE,
ADD COLUMN IF NOT EXISTS is_insured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS insurance_name TEXT,
ADD COLUMN IF NOT EXISTS previous_owner TEXT;

-- Add comment to explain the new fields
COMMENT ON COLUMN public.pets.neuter_date IS 'Date when the pet was neutered/spayed';
COMMENT ON COLUMN public.pets.fee_exempt_reason IS 'Reason for fee exemption';
COMMENT ON COLUMN public.pets.microchip_date IS 'Date when microchip was inserted';
COMMENT ON COLUMN public.pets.enclosure_number IS 'Enclosure/pen number for farm animals';
COMMENT ON COLUMN public.pets.blood_type IS 'Blood type of the pet';
COMMENT ON COLUMN public.pets.price_list IS 'Price list category for this pet';
COMMENT ON COLUMN public.pets.food_type IS 'Type of food the pet eats';
COMMENT ON COLUMN public.pets.notes IS 'General notes about the pet';
COMMENT ON COLUMN public.pets.alert_note IS 'Important alert note about the pet';
COMMENT ON COLUMN public.pets.is_alert IS 'Whether this pet has an alert';
COMMENT ON COLUMN public.pets.has_allergies IS 'Whether this pet has allergies';
COMMENT ON COLUMN public.pets.inactive_reason IS 'Reason why the pet is inactive';
COMMENT ON COLUMN public.pets.last_file_sent_date IS 'Last date pet file was sent';
COMMENT ON COLUMN public.pets.is_insured IS 'Whether the owner has insurance for this pet';
COMMENT ON COLUMN public.pets.insurance_name IS 'Name of the insurance company';
COMMENT ON COLUMN public.pets.previous_owner IS 'Previous owner if ownership was transferred';