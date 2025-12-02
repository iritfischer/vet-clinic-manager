import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Tables } from '@/integrations/supabase/types';

type Clinic = Tables<'clinics'>;

export const useClinic = () => {
  const { user } = useAuth();
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchClinicData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch profile with clinic data in a single query using JOIN
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('clinic_id, clinics(*)')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData?.clinic_id) {
        setLoading(false);
        return;
      }

      setClinicId(profileData.clinic_id);

      if (profileData.clinics) {
        setClinic(profileData.clinics as Clinic);
      }
    } catch (error) {
      console.error('Error fetching clinic:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchClinicData();
  }, [fetchClinicData]);

  const refetchClinic = useCallback(async () => {
    if (clinicId) {
      const { data: clinicData, error: clinicError } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', clinicId)
        .single();

      if (!clinicError && clinicData) {
        setClinic(clinicData);
      }
    }
  }, [clinicId]);

  return { clinicId, clinic, loading, refetchClinic };
};
