-- Create pet_status_history table to track status changes
CREATE TABLE public.pet_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.pet_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view pet status history in their clinic"
  ON public.pet_status_history FOR SELECT
  TO authenticated
  USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Staff can insert pet status history in their clinic"
  ON public.pet_status_history FOR INSERT
  TO authenticated
  WITH CHECK (clinic_id = public.get_user_clinic_id(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_pet_status_history_pet_id ON public.pet_status_history(pet_id);
CREATE INDEX idx_pet_status_history_changed_at ON public.pet_status_history(changed_at);
