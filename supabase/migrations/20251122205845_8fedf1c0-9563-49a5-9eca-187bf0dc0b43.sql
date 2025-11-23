-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'vet', 'reception');

-- Create clinics table
CREATE TABLE public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_primary TEXT NOT NULL,
  phone_secondary TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  whatsapp_opt_in BOOLEAN DEFAULT false,
  portal_enabled BOOLEAN DEFAULT false,
  portal_login_method TEXT DEFAULT 'magic_link' CHECK (portal_login_method IN ('magic_link', 'password', 'none')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create pets table
CREATE TABLE public.pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  species TEXT NOT NULL CHECK (species IN ('dog', 'cat', 'other')),
  breed TEXT,
  sex TEXT CHECK (sex IN ('male', 'female')),
  neuter_status TEXT CHECK (neuter_status IN ('intact', 'neutered', 'spayed')),
  birth_date DATE,
  current_weight DECIMAL(10, 2),
  weight_history JSONB DEFAULT '[]'::jsonb,
  color_markings TEXT,
  microchip_number TEXT,
  license_number TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deceased', 'transferred')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create visits table
CREATE TABLE public.visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  vet_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  visit_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  visit_type TEXT NOT NULL CHECK (visit_type IN ('clinic', 'home_visit', 'phone', 'online')),
  chief_complaint TEXT,
  history TEXT,
  physical_exam TEXT,
  diagnoses JSONB DEFAULT '[]'::jsonb,
  treatments JSONB DEFAULT '[]'::jsonb,
  medications JSONB DEFAULT '[]'::jsonb,
  recommendations TEXT,
  client_summary TEXT,
  is_visible_to_client BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  vet_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  appointment_type TEXT NOT NULL CHECK (appointment_type IN ('clinic', 'home_visit', 'phone', 'online')),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create price_items table
CREATE TABLE public.price_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  code TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('visit', 'vaccination', 'treatment', 'medication', 'surgery', 'other')),
  price_without_vat DECIMAL(10, 2) NOT NULL,
  price_with_vat DECIMAL(10, 2) NOT NULL,
  is_discountable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create reminders table
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('annual_vaccination', 'deworming', 'blood_test', 'chronic_treatment', 'recheck', 'other')),
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'completed', 'postponed')),
  last_channel TEXT CHECK (last_channel IN ('whatsapp', 'email', 'phone', 'none')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create whatsapp_messages table
CREATE TABLE public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  reminder_id UUID REFERENCES public.reminders(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  provider_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to get user's clinic_id
CREATE OR REPLACE FUNCTION public.get_user_clinic_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clinic_id FROM public.profiles WHERE id = _user_id
$$;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for clinics
CREATE POLICY "Users can view their own clinic"
  ON public.clinics FOR SELECT
  TO authenticated
  USING (id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Admins can update their clinic"
  ON public.clinics FOR UPDATE
  TO authenticated
  USING (
    id = public.get_user_clinic_id(auth.uid()) AND
    public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles in their clinic"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can manage profiles in their clinic"
  ON public.profiles FOR ALL
  TO authenticated
  USING (
    clinic_id = public.get_user_clinic_id(auth.uid()) AND
    public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles in their clinic"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = user_id
      AND clinic_id = public.get_user_clinic_id(auth.uid())
    ) AND
    public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for clients
CREATE POLICY "Staff can view clients in their clinic"
  ON public.clients FOR SELECT
  TO authenticated
  USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Staff can manage clients in their clinic"
  ON public.clients FOR ALL
  TO authenticated
  USING (clinic_id = public.get_user_clinic_id(auth.uid()));

-- RLS Policies for pets
CREATE POLICY "Staff can view pets in their clinic"
  ON public.pets FOR SELECT
  TO authenticated
  USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Staff can manage pets in their clinic"
  ON public.pets FOR ALL
  TO authenticated
  USING (clinic_id = public.get_user_clinic_id(auth.uid()));

-- RLS Policies for visits
CREATE POLICY "Staff can view visits in their clinic"
  ON public.visits FOR SELECT
  TO authenticated
  USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Vets can manage visits in their clinic"
  ON public.visits FOR ALL
  TO authenticated
  USING (
    clinic_id = public.get_user_clinic_id(auth.uid()) AND
    (public.has_role(auth.uid(), 'vet') OR public.has_role(auth.uid(), 'admin'))
  );

-- RLS Policies for appointments
CREATE POLICY "Staff can view appointments in their clinic"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Staff can manage appointments in their clinic"
  ON public.appointments FOR ALL
  TO authenticated
  USING (clinic_id = public.get_user_clinic_id(auth.uid()));

-- RLS Policies for price_items
CREATE POLICY "Staff can view price items in their clinic"
  ON public.price_items FOR SELECT
  TO authenticated
  USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Admins can manage price items in their clinic"
  ON public.price_items FOR ALL
  TO authenticated
  USING (
    clinic_id = public.get_user_clinic_id(auth.uid()) AND
    public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for reminders
CREATE POLICY "Staff can view reminders in their clinic"
  ON public.reminders FOR SELECT
  TO authenticated
  USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Staff can manage reminders in their clinic"
  ON public.reminders FOR ALL
  TO authenticated
  USING (clinic_id = public.get_user_clinic_id(auth.uid()));

-- RLS Policies for whatsapp_messages
CREATE POLICY "Staff can view whatsapp messages in their clinic"
  ON public.whatsapp_messages FOR SELECT
  TO authenticated
  USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Staff can create whatsapp messages in their clinic"
  ON public.whatsapp_messages FOR INSERT
  TO authenticated
  WITH CHECK (clinic_id = public.get_user_clinic_id(auth.uid()));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers to all tables
CREATE TRIGGER update_clinics_updated_at
  BEFORE UPDATE ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pets_updated_at
  BEFORE UPDATE ON public.pets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_visits_updated_at
  BEFORE UPDATE ON public.visits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_price_items_updated_at
  BEFORE UPDATE ON public.price_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_profiles_clinic_id ON public.profiles(clinic_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_clients_clinic_id ON public.clients(clinic_id);
CREATE INDEX idx_clients_phone ON public.clients(phone_primary);
CREATE INDEX idx_pets_clinic_id ON public.pets(clinic_id);
CREATE INDEX idx_pets_client_id ON public.pets(client_id);
CREATE INDEX idx_visits_clinic_id ON public.visits(clinic_id);
CREATE INDEX idx_visits_pet_id ON public.visits(pet_id);
CREATE INDEX idx_visits_date ON public.visits(visit_date);
CREATE INDEX idx_appointments_clinic_id ON public.appointments(clinic_id);
CREATE INDEX idx_appointments_vet_id ON public.appointments(vet_id);
CREATE INDEX idx_appointments_start_time ON public.appointments(start_time);
CREATE INDEX idx_reminders_clinic_id ON public.reminders(clinic_id);
CREATE INDEX idx_reminders_due_date ON public.reminders(due_date);
CREATE INDEX idx_whatsapp_messages_clinic_id ON public.whatsapp_messages(clinic_id);
CREATE INDEX idx_whatsapp_messages_client_id ON public.whatsapp_messages(client_id);