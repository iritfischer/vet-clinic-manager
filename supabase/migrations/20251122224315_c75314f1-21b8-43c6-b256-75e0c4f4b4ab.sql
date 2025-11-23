-- Add metrics_history column to pets table to store all vital signs history
ALTER TABLE pets ADD COLUMN IF NOT EXISTS metrics_history jsonb DEFAULT '[]'::jsonb;

-- Add comment to explain the structure
COMMENT ON COLUMN pets.metrics_history IS 'Array of metric records with structure: [{date: string, weight: number, temperature: number, heart_rate: number, respiration_rate: number, blood_pressure: string, recorded_at: timestamp}]';