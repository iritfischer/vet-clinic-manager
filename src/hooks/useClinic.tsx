import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useClinic = () => {
  const { user } = useAuth();
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClinicId = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('clinic_id')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setClinicId(data.clinic_id);
      }
      setLoading(false);
    };

    fetchClinicId();
  }, [user]);

  return { clinicId, loading };
};
