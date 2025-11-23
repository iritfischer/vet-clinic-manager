-- Update the handle_new_user function to create a clinic and assign it
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_clinic_id uuid;
BEGIN
  -- Create a new clinic for the user
  INSERT INTO public.clinics (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'clinic_name', 'מרפאה של ' || COALESCE(NEW.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(NEW.raw_user_meta_data->>'last_name', '')))
  RETURNING id INTO new_clinic_id;

  -- Create the user profile with the clinic_id
  INSERT INTO public.profiles (id, first_name, last_name, phone, clinic_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    new_clinic_id
  );

  -- Assign admin role to the new user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');

  RETURN NEW;
END;
$$;