import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';
import { useToast } from '@/hooks/use-toast';
import { Lead, LeadFormData, LeadInsert, LeadUpdate } from '@/types/leads';

export const useLeads = () => {
  const { clinicId } = useClinic();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all leads for the clinic
  const fetchLeads = useCallback(async () => {
    if (!clinicId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בטעינת לידים',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [clinicId, toast]);

  // Initial fetch
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Create a new lead
  const createLead = useCallback(async (formData: LeadFormData): Promise<Lead | null> => {
    if (!clinicId) return null;

    try {
      const insertData: LeadInsert = {
        clinic_id: clinicId,
        first_name: formData.first_name,
        last_name: formData.last_name || null,
        phone: formData.phone,
        email: formData.email || null,
        address: formData.address || null,
        notes: formData.notes || null,
        status: formData.status,
        pet_name: formData.pet_name || null,
        pet_species: formData.pet_species || null,
        pet_breed: formData.pet_breed || null,
        pet_notes: formData.pet_notes || null,
        source: 'whatsapp',
      };

      const { data, error } = await supabase
        .from('leads')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      setLeads(prev => [data, ...prev]);
      toast({
        title: 'הצלחה',
        description: 'הליד נוצר בהצלחה',
      });

      return data;
    } catch (error: any) {
      console.error('Error creating lead:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'שגיאה ביצירת ליד',
        variant: 'destructive',
      });
      return null;
    }
  }, [clinicId, toast]);

  // Update a lead
  const updateLead = useCallback(async (leadId: string, updates: Partial<LeadFormData>): Promise<boolean> => {
    try {
      const updateData: LeadUpdate = {
        first_name: updates.first_name,
        last_name: updates.last_name || null,
        phone: updates.phone,
        email: updates.email || null,
        address: updates.address || null,
        notes: updates.notes || null,
        status: updates.status,
        pet_name: updates.pet_name || null,
        pet_species: updates.pet_species || null,
        pet_breed: updates.pet_breed || null,
        pet_notes: updates.pet_notes || null,
      };

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', leadId);

      if (error) throw error;

      setLeads(prev => prev.map(lead =>
        lead.id === leadId ? { ...lead, ...updateData } : lead
      ));

      toast({
        title: 'הצלחה',
        description: 'הליד עודכן בהצלחה',
      });

      return true;
    } catch (error: any) {
      console.error('Error updating lead:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'שגיאה בעדכון ליד',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // Delete a lead
  const deleteLead = useCallback(async (leadId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;

      setLeads(prev => prev.filter(lead => lead.id !== leadId));
      toast({
        title: 'הצלחה',
        description: 'הליד נמחק בהצלחה',
      });

      return true;
    } catch (error: any) {
      console.error('Error deleting lead:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'שגיאה במחיקת ליד',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // Get lead by phone number
  const getLeadByPhone = useCallback(async (phone: string): Promise<Lead | null> => {
    if (!clinicId) return null;

    try {
      // Normalize phone - remove spaces, dashes, etc.
      const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');

      // Try to find by exact match or with different formats
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('clinic_id', clinicId)
        .or(`phone.eq.${normalizedPhone},phone.eq.${normalizedPhone.replace(/^972/, '0')},phone.eq.${normalizedPhone.replace(/^0/, '972')}`)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

      return data || null;
    } catch (error: any) {
      console.error('Error getting lead by phone:', error);
      return null;
    }
  }, [clinicId]);

  // Convert lead to client
  const convertLeadToClient = useCallback(async (
    leadId: string,
    createPet: boolean = false
  ): Promise<{ clientId: string; petId?: string } | null> => {
    if (!clinicId) return null;

    try {
      // Get the lead data
      const lead = leads.find(l => l.id === leadId);
      if (!lead) throw new Error('ליד לא נמצא');

      // Create client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert({
          clinic_id: clinicId,
          first_name: lead.first_name,
          last_name: lead.last_name || '',
          phone_primary: lead.phone,
          email: lead.email,
          address: lead.address,
          notes: lead.notes,
          status: 'active',
          whatsapp_opt_in: true,
        })
        .select()
        .single();

      if (clientError) throw clientError;

      let petId: string | undefined;

      // Create pet if requested and pet info exists
      if (createPet && lead.pet_name) {
        const { data: petData, error: petError } = await supabase
          .from('pets')
          .insert({
            clinic_id: clinicId,
            client_id: clientData.id,
            name: lead.pet_name,
            species: lead.pet_species || 'dog',
            breed: lead.pet_breed,
            notes: lead.pet_notes,
          })
          .select()
          .single();

        if (petError) {
          console.error('Error creating pet:', petError);
        } else {
          petId = petData.id;
        }
      }

      // Update lead status to converted
      await supabase
        .from('leads')
        .update({
          status: 'converted',
          converted_client_id: clientData.id,
          converted_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      // Update whatsapp_messages to link to new client
      await supabase
        .from('whatsapp_messages')
        .update({ client_id: clientData.id, lead_id: null })
        .eq('lead_id', leadId);

      // Update local state
      setLeads(prev => prev.map(l =>
        l.id === leadId
          ? { ...l, status: 'converted', converted_client_id: clientData.id, converted_at: new Date().toISOString() }
          : l
      ));

      toast({
        title: 'הצלחה',
        description: 'הליד הומר ללקוח בהצלחה',
      });

      return { clientId: clientData.id, petId };
    } catch (error: any) {
      console.error('Error converting lead to client:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'שגיאה בהמרת ליד ללקוח',
        variant: 'destructive',
      });
      return null;
    }
  }, [clinicId, leads, toast]);

  // Link messages to lead by phone
  const linkMessagesToLead = useCallback(async (leadId: string, phone: string): Promise<boolean> => {
    if (!clinicId) return false;

    try {
      // Normalize phone
      const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');

      // Update messages that have this phone and no client/lead
      const { error } = await supabase
        .from('whatsapp_messages')
        .update({ lead_id: leadId })
        .eq('clinic_id', clinicId)
        .is('client_id', null)
        .is('lead_id', null)
        .or(`sender_phone.eq.${normalizedPhone},sender_phone.eq.${normalizedPhone.replace(/^972/, '0')},sender_phone.eq.${normalizedPhone.replace(/^0/, '972')}`);

      if (error) throw error;

      return true;
    } catch (error: any) {
      console.error('Error linking messages to lead:', error);
      return false;
    }
  }, [clinicId]);

  return {
    leads,
    loading,
    fetchLeads,
    createLead,
    updateLead,
    deleteLead,
    getLeadByPhone,
    convertLeadToClient,
    linkMessagesToLead,
  };
};
