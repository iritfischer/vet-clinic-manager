import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useClinic } from '@/hooks/useClinic';
import { VisitsTable } from '@/components/visits/VisitsTable';
import { VisitDialog } from '@/components/visits/VisitDialog';
import { useToast } from '@/hooks/use-toast';

type Visit = Tables<'visits'> & {
  clients?: Tables<'clients'> | null;
  pets?: Tables<'pets'> | null;
};

const Visits = () => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const { clinicId } = useClinic();
  const { toast } = useToast();

  useEffect(() => {
    if (clinicId) {
      fetchVisits();
    }
  }, [clinicId]);

  const fetchVisits = async () => {
    if (!clinicId) return;

    try {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          *,
          clients:client_id(*),
          pets:pet_id(*)
        `)
        .eq('clinic_id', clinicId)
        .order('visit_date', { ascending: false });

      if (error) throw error;
      setVisits(data || []);
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: any) => {
    if (!clinicId) return;

    try {
      // Extract follow_ups and price_items BEFORE building visitData
      const follow_ups = data._follow_ups || data.follow_ups;
      const price_items = data._price_items || data.price_items;

      // Build clean visitData object with ONLY valid visit table columns
      // DO NOT use spread operator - explicitly list each field
      const visitData: Record<string, any> = {
        client_id: data.client_id,
        pet_id: data.pet_id,
        visit_type: data.visit_type,
        visit_date: data.visit_date,
        chief_complaint: data.chief_complaint || null,
        history: data.history || null,
        physical_exam: data.physical_exam || null,
        diagnoses: data.diagnoses || null,
        treatments: data.treatments || null,
        medications: data.medications || null,
        recommendations: data.recommendations || null,
        client_summary: data.client_summary || null,
        status: data.status || 'open',
      };

      // Only add optional fields if they have values
      if (data.vet_id) {
        visitData.vet_id = data.vet_id;
      }

      let visitId: string;

      if (editingVisit) {
        console.log('DEBUG - About to UPDATE with visitData:', visitData);
        const { error } = await supabase
          .from('visits')
          .update(visitData)
          .eq('id', editingVisit.id);

        if (error) throw error;
        visitId = editingVisit.id;

        // Delete existing price items
        await supabase
          .from('visit_price_items')
          .delete()
          .eq('visit_id', visitId);

        toast({ title: 'הביקור עודכן בהצלחה' });
      } else {
        // Create a clean object with only the columns that exist in the visits table
        const dataToInsert = {
          clinic_id: clinicId,
          client_id: visitData.client_id,
          pet_id: visitData.pet_id,
          visit_type: visitData.visit_type,
          visit_date: visitData.visit_date,
          chief_complaint: visitData.chief_complaint,
          history: visitData.history,
          physical_exam: visitData.physical_exam,
          diagnoses: visitData.diagnoses,
          treatments: visitData.treatments,
          medications: visitData.medications,
          recommendations: visitData.recommendations,
          client_summary: visitData.client_summary,
          status: visitData.status,
        };

        console.log('DEBUG - About to INSERT. dataToInsert:', JSON.stringify(dataToInsert, null, 2));
        console.log('DEBUG - Keys in dataToInsert:', Object.keys(dataToInsert));

        const { data: newVisit, error } = await supabase
          .from('visits')
          .insert(dataToInsert)
          .select()
          .single();

        if (error) {
          console.error('DEBUG - INSERT ERROR - Full error object:', JSON.stringify(error, null, 2));
          alert('Supabase Error: ' + error.message + '\n\nDetails: ' + error.details + '\n\nHint: ' + error.hint);
          throw error;
        }
        visitId = newVisit.id;
        toast({ title: 'הביקור נוסף בהצלחה' });
      }

      // Save price items if any
      if (price_items && price_items.length > 0) {
        // Fetch prices for all items
        const itemIds = price_items.map((pi: any) => pi.item_id);
        const { data: priceItemsData } = await supabase
          .from('price_items')
          .select('id, price_with_vat')
          .in('id', itemIds);

        const visitPriceItems = price_items.map((pi: any) => {
          const priceItem = priceItemsData?.find(p => p.id === pi.item_id);
          return {
            visit_id: visitId,
            price_item_id: pi.item_id,
            quantity: pi.quantity,
            price_at_time: priceItem?.price_with_vat || 0,
            clinic_id: clinicId,
          };
        });

        const { error: priceError } = await supabase
          .from('visit_price_items')
          .insert(visitPriceItems);

        if (priceError) throw priceError;
      }

      // Save follow-up reminders and appointments
      if (follow_ups && follow_ups.length > 0 && data.client_id && data.pet_id) {
        for (const followUp of follow_ups) {
          // Create reminder
          const { error: reminderError } = await supabase
            .from('reminders')
            .insert({
              clinic_id: clinicId,
              client_id: data.client_id,
              pet_id: data.pet_id,
              reminder_type: followUp.reminder_type || 'follow_up',
              due_date: followUp.due_date,
              notes: followUp.notes || '',
              status: 'open',
            });

          if (reminderError) throw reminderError;

          // Create appointment in calendar (9:00 AM, 30 min duration)
          const appointmentDate = new Date(followUp.due_date);
          appointmentDate.setHours(9, 0, 0, 0);
          const endDate = new Date(appointmentDate);
          endDate.setMinutes(endDate.getMinutes() + 30);

          const { error: appointmentError } = await supabase
            .from('appointments')
            .insert({
              clinic_id: clinicId,
              client_id: data.client_id,
              pet_id: data.pet_id,
              appointment_type: `פולואו אפ - ${followUp.reminder_type || 'בדיקת מעקב'}`,
              start_time: appointmentDate.toISOString(),
              end_time: endDate.toISOString(),
              notes: followUp.notes || '',
              status: 'scheduled',
            });

          if (appointmentError) throw appointmentError;
        }

        if (follow_ups.length > 0) {
          toast({ 
            title: 'תזכורות פולואו אפ נוצרו', 
            description: `נוצרו ${follow_ups.length} תזכורות ותורים ביומן` 
          });
        }
      }

      setDialogOpen(false);
      setEditingVisit(null);
      fetchVisits();
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (visit: Visit) => {
    setEditingVisit(visit);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('visits')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'הביקור נמחק בהצלחה' });
      fetchVisits();
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleGeneratePdf = async (visit: Visit) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-visit-pdf', {
        body: { visitId: visit.id },
      });

      if (error) throw error;

      toast({ 
        title: 'PDF נוצר בהצלחה',
        description: 'הקובץ מוכן להורדה'
      });
      
      // In a real implementation, you would download the PDF here
      console.log('PDF data:', data);
    } catch (error: any) {
      toast({
        title: 'שגיאה ביצירת PDF',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSendWhatsApp = async (visit: Visit) => {
    if (!visit.clients?.phone_primary) {
      toast({
        title: 'שגיאה',
        description: 'אין מספר טלפון ללקוח',
        variant: 'destructive',
      });
      return;
    }

    try {
      const message = `
שלום ${visit.clients.first_name},

סיכום הביקור של ${visit.pets?.name} מיום ${new Date(visit.visit_date).toLocaleDateString('he-IL')}:

${visit.client_summary || 'לא הוזן סיכום'}

${visit.recommendations ? `המלצות: ${visit.recommendations}` : ''}

בברכה,
${clinicId ? 'צוות המרפאה' : ''}
      `.trim();

      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          phone: visit.clients.phone_primary,
          message,
          visitId: visit.id,
        },
      });

      if (error) throw error;

      toast({
        title: 'הודעה נשלחה בהצלחה',
        description: `נשלח ל-${visit.clients.phone_primary}`,
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה בשליחת הודעה',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingVisit(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">ניהול ביקורים רפואיים</h1>
            <p className="text-muted-foreground mt-2">
              תיעוד מלא של כל ביקור רפואי במרפאה
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            ביקור חדש
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <VisitsTable
            visits={visits}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onGeneratePdf={handleGeneratePdf}
            onSendWhatsApp={handleSendWhatsApp}
          />
        )}

        <VisitDialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          onSave={handleSave}
          visit={editingVisit}
        />
      </div>
    </DashboardLayout>
  );
};

export default Visits;
