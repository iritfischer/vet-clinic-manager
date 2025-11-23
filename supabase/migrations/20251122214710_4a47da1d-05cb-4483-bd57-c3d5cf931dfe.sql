-- Create visit_price_items table to link visits with price items
CREATE TABLE public.visit_price_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_id UUID NOT NULL,
  price_item_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_at_time NUMERIC NOT NULL,
  clinic_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.visit_price_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Staff can view visit price items in their clinic"
ON public.visit_price_items
FOR SELECT
USING (clinic_id = get_user_clinic_id(auth.uid()));

CREATE POLICY "Staff can manage visit price items in their clinic"
ON public.visit_price_items
FOR ALL
USING (clinic_id = get_user_clinic_id(auth.uid()));
