-- Add new columns to visits table for exam data
ALTER TABLE visits
ADD COLUMN IF NOT EXISTS general_history TEXT,
ADD COLUMN IF NOT EXISTS medical_history TEXT,
ADD COLUMN IF NOT EXISTS current_history TEXT,
ADD COLUMN IF NOT EXISTS additional_tests TEXT;

-- Optional: Migrate data from old 'history' column to 'medical_history' if you want to preserve the old data
-- UPDATE visits SET medical_history = history WHERE history IS NOT NULL AND medical_history IS NULL;
