import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

export type Vaccination = Tables<'vaccinations'>;
export type VaccinationInsert = Omit<Tables<'vaccinations'>, 'id' | 'clinic_id' | 'created_at' | 'updated_at'>;
export type VaccinationUpdate = Partial<Omit<Tables<'vaccinations'>, 'id' | 'clinic_id' | 'created_at' | 'updated_at'>>;

export const useVaccinations = (speciesFilter?: 'dog' | 'cat' | 'other' | 'all') => {
  const { clinicId } = useClinic();
  const { toast } = useToast();
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch vaccinations - optionally filtered by species
  const fetchVaccinations = useCallback(async () => {
    if (!clinicId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('vaccinations')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('species', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('label', { ascending: true });

      if (speciesFilter) {
        // Include 'all' species and the specific species filter
        query = query.in('species', [speciesFilter, 'all']);
      }

      const { data, error } = await query;

      if (error) {
        // PGRST205 = table not found in schema cache
        // 42P01 = relation does not exist
        if (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('Vaccinations table does not exist yet. Please run the migration:', 'supabase/migrations/20251202220000_create_vaccinations_table.sql');
          console.warn('You can run it via Supabase Dashboard SQL Editor or using Supabase CLI: supabase db push');
          setVaccinations([]);
          return;
        }
        throw error;
      }
      setVaccinations((data as Vaccination[]) || []);
    } catch (error: any) {
      console.error('Error fetching vaccinations:', error);
      
      // Don't show toast for table not existing - it's expected until migration runs
      if (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('Vaccinations table does not exist. Please run the migration file: supabase/migrations/20251202220000_create_vaccinations_table.sql');
      } else {
        // Only show toast for other errors
        toast({
          title: 'שגיאה',
          description: error.message || 'שגיאה בטעינת חיסונים',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [clinicId, speciesFilter, toast]);

  // Initial fetch
  useEffect(() => {
    fetchVaccinations();
  }, [fetchVaccinations]);

  // Get vaccinations by species
  const getVaccinationsBySpecies = useCallback((species: 'dog' | 'cat' | 'other'): Vaccination[] => {
    return vaccinations.filter(v => 
      v.is_active && (v.species === species || v.species === 'all')
    );
  }, [vaccinations]);

  // Get vaccination by name
  const getVaccinationByName = useCallback((name: string, species?: 'dog' | 'cat' | 'other'): Vaccination | undefined => {
    return vaccinations.find(v => 
      v.name === name && 
      v.is_active &&
      (!species || v.species === species || v.species === 'all')
    );
  }, [vaccinations]);

  // Create a new vaccination
  const createVaccination = useCallback(async (vaccinationData: VaccinationInsert): Promise<Vaccination | null> => {
    if (!clinicId) return null;

    try {
      const insertData = {
        clinic_id: clinicId,
        name: vaccinationData.name,
        label: vaccinationData.label,
        species: vaccinationData.species,
        interval_days: vaccinationData.interval_days,
        description: vaccinationData.description || null,
        is_active: vaccinationData.is_active ?? true,
        sort_order: vaccinationData.sort_order ?? 0,
        price_without_vat: vaccinationData.price_without_vat ?? null,
        price_with_vat: vaccinationData.price_with_vat ?? null,
      };

      const { data, error } = await supabase
        .from('vaccinations')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      const newVaccination = data as Vaccination;

      // Only add to local state if it matches current filter
      if (!speciesFilter || newVaccination.species === speciesFilter || newVaccination.species === 'all') {
        setVaccinations(prev => [...prev, newVaccination].sort((a, b) => {
          if (a.species !== b.species) return a.species.localeCompare(b.species);
          if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
          return a.label.localeCompare(b.label);
        }));
      }

      toast({
        title: 'הצלחה',
        description: 'החיסון נוצר בהצלחה',
      });

      return newVaccination;
    } catch (error: any) {
      console.error('Error creating vaccination:', error);
      // Check for unique constraint violation
      if (error.code === '23505') {
        toast({
          title: 'שגיאה',
          description: 'חיסון עם שם זה כבר קיים עבור סוג חיית מחמד זה',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'שגיאה',
          description: error.message || 'שגיאה ביצירת חיסון',
          variant: 'destructive',
        });
      }
      return null;
    }
  }, [clinicId, speciesFilter, toast]);

  // Update a vaccination
  const updateVaccination = useCallback(async (vaccinationId: string, updates: VaccinationUpdate): Promise<boolean> => {
    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.label !== undefined) updateData.label = updates.label;
      if (updates.species !== undefined) updateData.species = updates.species;
      if (updates.interval_days !== undefined) updateData.interval_days = updates.interval_days;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
      if (updates.sort_order !== undefined) updateData.sort_order = updates.sort_order;
      if (updates.price_without_vat !== undefined) updateData.price_without_vat = updates.price_without_vat;
      if (updates.price_with_vat !== undefined) updateData.price_with_vat = updates.price_with_vat;

      const { error } = await supabase
        .from('vaccinations')
        .update(updateData)
        .eq('id', vaccinationId);

      if (error) throw error;

      setVaccinations(prev => prev.map(vaccination =>
        vaccination.id === vaccinationId ? { ...vaccination, ...updateData } : vaccination
      ));

      toast({
        title: 'הצלחה',
        description: 'החיסון עודכן בהצלחה',
      });

      return true;
    } catch (error: any) {
      console.error('Error updating vaccination:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'שגיאה בעדכון חיסון',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // Delete a vaccination (hard delete)
  const deleteVaccination = useCallback(async (vaccinationId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('vaccinations')
        .delete()
        .eq('id', vaccinationId);

      if (error) throw error;

      setVaccinations(prev => prev.filter(vaccination => vaccination.id !== vaccinationId));

      toast({
        title: 'הצלחה',
        description: 'החיסון נמחק בהצלחה',
      });

      return true;
    } catch (error: any) {
      console.error('Error deleting vaccination:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'שגיאה במחיקת חיסון',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  return {
    vaccinations,
    loading,
    fetchVaccinations,
    getVaccinationsBySpecies,
    getVaccinationByName,
    createVaccination,
    updateVaccination,
    deleteVaccination,
  };
};

