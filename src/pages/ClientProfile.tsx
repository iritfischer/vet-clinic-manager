import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, Phone, Mail, MapPin, Edit, Plus, Calendar, Stethoscope, FileText, TrendingUp, Syringe, X, MessageCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useClinic } from '@/hooks/useClinic';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { VisitForm } from '@/components/visits/VisitForm';
import { PetTimeline } from '@/components/clients/PetTimeline';
import { ClientWhatsAppChat } from '@/components/clients/ClientWhatsAppChat';
import { PetDialog } from '@/components/pets/PetDialog';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

type Client = Tables<'clients'>;
type Pet = Tables<'pets'>;
type Visit = Tables<'visits'> & {
  pets?: Pet | null;
};

const ClientProfile = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { clinicId } = useClinic();
  const { toast } = useToast();
  const { sendMessage, isEnabled: whatsappEnabled, isConfigured: whatsappConfigured } = useWhatsApp();
  const [client, setClient] = useState<Client | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [visitsByPet, setVisitsByPet] = useState<Record<string, Visit[]>>({});
  const [loading, setLoading] = useState(true);
  const [showNewVisitForm, setShowNewVisitForm] = useState(false);
  const [selectedPetForNewVisit, setSelectedPetForNewVisit] = useState<string | null>(null);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [newMetrics, setNewMetrics] = useState<Record<string, {
    date: string;
    weight: string;
    temperature: string;
    heart_rate: string;
    respiration_rate: string;
    blood_pressure: string;
  }>>({});
  const [showWeightChart, setShowWeightChart] = useState<Record<string, boolean>>({});
  const [showVaccinationForm, setShowVaccinationForm] = useState<string | null>(null); // petId or null
  const [vaccinationForm, setVaccinationForm] = useState({
    vaccination_type: '',
    vaccination_date: new Date().toISOString().slice(0, 10),
    skip_reminder: false,
  });

  // WhatsApp state
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);

  // Pet dialog state
  const [petDialogOpen, setPetDialogOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);

  // Selected pet for sidebar display
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const selectedPet = pets.find(p => p.id === selectedPetId) || pets[0] || null;

  // סוגי חיסונים
  const VACCINATION_TYPES = {
    dog: [
      { value: 'rabies', label: 'כלבת', nextDueDays: 365 },
      { value: 'dhpp', label: 'משושה (DHPP)', nextDueDays: 365 },
      { value: 'leptospirosis', label: 'לפטוספירוזיס', nextDueDays: 365 },
      { value: 'bordetella', label: 'בורדטלה (שיעול מלונות)', nextDueDays: 180 },
      { value: 'lyme', label: 'ליים', nextDueDays: 365 },
    ],
    cat: [
      { value: 'rabies', label: 'כלבת', nextDueDays: 365 },
      { value: 'fvrcp', label: 'משולש (FVRCP)', nextDueDays: 365 },
      { value: 'felv', label: 'לויקמיה (FeLV)', nextDueDays: 365 },
      { value: 'fiv', label: 'איידס חתולים (FIV)', nextDueDays: 365 },
    ],
    other: [
      { value: 'rabies', label: 'כלבת', nextDueDays: 365 },
      { value: 'other', label: 'אחר', nextDueDays: 365 },
    ],
  };

  useEffect(() => {
    if (clientId && clinicId) {
      fetchClientData();
    }
  }, [clientId, clinicId]);

  const fetchClientData = async () => {
    try {
      // Fetch client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId as string)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Fetch pets
      const { data: petsData, error: petsError } = await supabase
        .from('pets')
        .select('*')
        .eq('client_id', clientId as string)
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (petsError) throw petsError;
      setPets(petsData || []);

      // Fetch visits for all pets
      if (petsData && petsData.length > 0) {
        const { data: visitsData, error: visitsError } = await supabase
          .from('visits')
          .select('*, pets:pet_id(*)')
          .eq('client_id', clientId as string)
          .order('visit_date', { ascending: false });

        if (visitsError) throw visitsError;

        // Group visits by pet
        const grouped = (visitsData || []).reduce((acc, visit) => {
          const petId = visit.pet_id;
          if (!acc[petId]) {
            acc[petId] = [];
          }
          acc[petId].push(visit);
          return acc;
        }, {} as Record<string, Visit[]>);

        setVisitsByPet(grouped);
      }
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

  const handleNewVisit = async (visitData: any) => {
    try {
      if (!clinicId) return;

      // Extract follow_ups and price_items
      const follow_ups = visitData._follow_ups || visitData.follow_ups;
      const price_items = visitData._price_items || visitData.price_items;

      // Build clean object with only valid visits table columns
      const cleanVisitData = {
        clinic_id: clinicId,
        client_id: visitData.client_id,
        pet_id: visitData.pet_id,
        visit_type: visitData.visit_type,
        visit_date: visitData.visit_date,
        chief_complaint: visitData.chief_complaint || null,
        history: visitData.history || null,
        physical_exam: visitData.physical_exam || null,
        diagnoses: visitData.diagnoses || null,
        treatments: visitData.treatments || null,
        medications: visitData.medications || null,
        recommendations: visitData.recommendations || null,
        client_summary: visitData.client_summary || null,
        status: visitData.status || 'open',
      };

      const { data: visit, error: visitError } = await supabase
        .from('visits')
        .insert(cleanVisitData)
        .select()
        .single();

      if (visitError) throw visitError;

      // Save price items if any
      if (price_items && price_items.length > 0) {
        // Fetch current prices for all items
        const itemIds = price_items.map((item: any) => item.item_id);
        const { data: priceItemsData } = await supabase
          .from('price_items')
          .select('id, price_with_vat')
          .in('id', itemIds);

        const priceItemsToInsert = price_items.map((item: any) => {
          const priceItem = priceItemsData?.find(p => p.id === item.item_id);
          return {
            visit_id: visit.id,
            price_item_id: item.item_id,
            quantity: item.quantity,
            clinic_id: clinicId,
            price_at_time: priceItem?.price_with_vat || 0,
          };
        });

        const { error: priceItemsError } = await supabase
          .from('visit_price_items')
          .insert(priceItemsToInsert);

        if (priceItemsError) throw priceItemsError;
      }

      // Save follow-up reminders and appointments
      if (follow_ups && follow_ups.length > 0 && visitData.client_id && visitData.pet_id) {
        for (const followUp of follow_ups) {
          // Create reminder
          await supabase
            .from('reminders')
            .insert({
              clinic_id: clinicId,
              client_id: visitData.client_id,
              pet_id: visitData.pet_id,
              reminder_type: followUp.reminder_type || 'follow_up',
              due_date: followUp.due_date,
              notes: followUp.notes || '',
              status: 'open',
            });

          // Create appointment in calendar (9:00 AM, 30 min duration)
          const appointmentDate = new Date(followUp.due_date);
          appointmentDate.setHours(9, 0, 0, 0);
          const endDate = new Date(appointmentDate);
          endDate.setMinutes(endDate.getMinutes() + 30);

          await supabase
            .from('appointments')
            .insert({
              clinic_id: clinicId,
              client_id: visitData.client_id,
              pet_id: visitData.pet_id,
              appointment_type: `פולואו אפ - ${followUp.reminder_type || 'בדיקת מעקב'}`,
              start_time: appointmentDate.toISOString(),
              end_time: endDate.toISOString(),
              notes: followUp.notes || '',
              status: 'scheduled',
            });
        }
      }

      toast({
        title: 'הצלחה',
        description: follow_ups?.length > 0
          ? `הביקור נוסף בהצלחה עם ${follow_ups.length} תזכורות פולואו אפ`
          : 'הביקור נוסף בהצלחה',
      });

      setShowNewVisitForm(false);
      setSelectedPetForNewVisit(null);
      fetchClientData();
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEditVisit = async (visitData: any) => {
    try {
      if (!clinicId || !editingVisit) return;

      // Extract price_items (follow_ups reserved for future use)
      void (visitData._follow_ups || visitData.follow_ups);
      const price_items = visitData._price_items || visitData.price_items;

      // Build clean object with only valid visits table columns
      const cleanVisitData = {
        client_id: visitData.client_id,
        pet_id: visitData.pet_id,
        visit_type: visitData.visit_type,
        visit_date: visitData.visit_date,
        chief_complaint: visitData.chief_complaint || null,
        history: visitData.history || null,
        physical_exam: visitData.physical_exam || null,
        diagnoses: visitData.diagnoses || null,
        treatments: visitData.treatments || null,
        medications: visitData.medications || null,
        recommendations: visitData.recommendations || null,
        client_summary: visitData.client_summary || null,
        status: visitData.status || 'open',
      };

      const { error: visitError } = await supabase
        .from('visits')
        .update(cleanVisitData)
        .eq('id', editingVisit.id);

      if (visitError) throw visitError;

      // Update price items - delete existing and insert new ones
      if (price_items) {
        // Delete existing price items
        await supabase
          .from('visit_price_items')
          .delete()
          .eq('visit_id', editingVisit.id);

        // Insert new price items if any
        if (price_items.length > 0) {
          const itemIds = price_items.map((item: any) => item.item_id);
          const { data: priceItemsData } = await supabase
            .from('price_items')
            .select('id, price_with_vat')
            .in('id', itemIds);

          const priceItemsToInsert = price_items.map((item: any) => {
            const priceItem = priceItemsData?.find(p => p.id === item.item_id);
            return {
              visit_id: editingVisit.id,
              price_item_id: item.item_id,
              quantity: item.quantity,
              clinic_id: clinicId,
              price_at_time: priceItem?.price_with_vat || 0,
            };
          });

          const { error: priceItemsError } = await supabase
            .from('visit_price_items')
            .insert(priceItemsToInsert);

          if (priceItemsError) throw priceItemsError;
        }
      }

      toast({
        title: 'הצלחה',
        description: 'הביקור עודכן בהצלחה',
      });

      setEditingVisit(null);
      setShowNewVisitForm(false);
      setSelectedPetForNewVisit(null);
      fetchClientData();
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleExportPDF = async (visitId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-visit-pdf', {
        body: { visitId },
      });

      if (error) throw error;

      // Open HTML in new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(data);
        printWindow.document.close();
      }

      toast({
        title: 'הצלחה',
        description: 'נפתח חלון להדפסה/שמירה כ-PDF',
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSaveMetrics = async (petId: string) => {
    try {
      const metrics = newMetrics[petId];
      if (!metrics) return;

      // Get current pet data
      const pet = pets.find(p => p.id === petId);
      if (!pet) return;

      // Prepare new metric entry
      const newMetricEntry = {
        date: metrics.date,
        weight: metrics.weight ? parseFloat(metrics.weight) : null,
        temperature: metrics.temperature ? parseFloat(metrics.temperature) : null,
        heart_rate: metrics.heart_rate ? parseInt(metrics.heart_rate) : null,
        respiration_rate: metrics.respiration_rate ? parseInt(metrics.respiration_rate) : null,
        blood_pressure: metrics.blood_pressure || null,
        recorded_at: new Date().toISOString(),
      };

      // Get existing metrics history
      const existingMetrics = (pet.metrics_history as any[]) || [];
      const updatedMetrics = [...existingMetrics, newMetricEntry];

      // Update pet with new metrics
      const { error } = await supabase
        .from('pets')
        .update({
          metrics_history: updatedMetrics,
          current_weight: newMetricEntry.weight || pet.current_weight,
        })
        .eq('id', petId);

      if (error) throw error;

      toast({
        title: 'הצלחה',
        description: 'המדדים נשמרו בהצלחה',
      });

      // Clear form and refresh data
      setNewMetrics(prev => ({ ...prev, [petId]: {
        date: new Date().toISOString().split('T')[0],
        weight: '',
        temperature: '',
        heart_rate: '',
        respiration_rate: '',
        blood_pressure: '',
      }}));
      fetchClientData();
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSaveVaccination = async (petId: string) => {
    try {
      if (!vaccinationForm.vaccination_type || !vaccinationForm.vaccination_date) {
        toast({
          title: 'שגיאה',
          description: 'יש למלא את כל השדות',
          variant: 'destructive',
        });
        return;
      }

      const pet = pets.find(p => p.id === petId);
      if (!pet || !client) return;

      // מצא את סוג החיסון לקבלת התווית
      const species = pet.species?.toLowerCase() || 'other';
      const vaccineList = species.includes('כלב') || species.includes('dog')
        ? VACCINATION_TYPES.dog
        : species.includes('חתול') || species.includes('cat')
        ? VACCINATION_TYPES.cat
        : VACCINATION_TYPES.other;
      const selectedVaccine = vaccineList.find(v => v.value === vaccinationForm.vaccination_type);

      if (!selectedVaccine) return;

      // צור ביקור מסוג חיסון
      const visitType = `vaccination:${vaccinationForm.vaccination_type}:${selectedVaccine.label}`;

      // המר תאריך לפורמט datetime
      const visitDateTime = `${vaccinationForm.vaccination_date}T12:00:00`;

      const { error: visitError } = await supabase
        .from('visits')
        .insert({
          clinic_id: clinicId!,
          client_id: client.id,
          pet_id: petId,
          visit_type: visitType,
          visit_date: visitDateTime,
          status: 'completed',
        })
        .select()
        .single();

      if (visitError) {
        console.error('Visit insert error:', visitError);
        throw visitError;
      }

      // צור תזכורת לחיסון הבא (אם לא ביקשו לדלג)
      let reminderMessage = '';
      if (!vaccinationForm.skip_reminder) {
        const vaccinationDate = new Date(vaccinationForm.vaccination_date);
        const nextDueDate = addDays(vaccinationDate, selectedVaccine.nextDueDays);

        const { error: reminderError } = await supabase
          .from('reminders')
          .insert({
            clinic_id: clinicId!,
            client_id: client.id,
            pet_id: petId,
            reminder_type: 'vaccination',
            due_date: nextDueDate.toISOString().slice(0, 10),
            notes: `חיסון ${selectedVaccine.label}`,
            status: 'pending',
          });

        if (reminderError) throw reminderError;
        reminderMessage = `. תזכורת נוצרה ל-${format(nextDueDate, 'dd/MM/yyyy', { locale: he })}`;
      }

      toast({
        title: 'הצלחה',
        description: `חיסון ${selectedVaccine.label} נשמר בהצלחה${reminderMessage}`,
      });

      // נקה טופס וסגור
      setShowVaccinationForm(null);
      setVaccinationForm({
        vaccination_type: '',
        vaccination_date: new Date().toISOString().slice(0, 10),
        skip_reminder: false,
      });
      fetchClientData();
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Handle adding a new pet
  const handlePetSave = async (data: any) => {
    if (!clinicId) return;

    try {
      // Check if we're editing an existing pet or creating a new one
      if (editingPet) {
        // Update existing pet
        const { error } = await supabase
          .from('pets')
          .update(data)
          .eq('id', editingPet.id);

        if (error) throw error;

        toast({
          title: 'הצלחה',
          description: 'פרטי חיית המחמד עודכנו בהצלחה',
        });
      } else {
        // Insert new pet
        const { error } = await supabase
          .from('pets')
          .insert({ ...data, clinic_id: clinicId });

        if (error) throw error;

        toast({
          title: 'הצלחה',
          description: 'חיית המחמד נוספה בהצלחה',
        });
      }

      setPetDialogOpen(false);
      setEditingPet(null);
      fetchClientData();
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // WhatsApp send function
  const handleSendWhatsApp = async () => {
    if (!client || !whatsappMessage.trim()) return;

    setSendingWhatsapp(true);
    try {
      const result = await sendMessage(client.phone_primary, whatsappMessage, {
        clientId: client.id,
      });

      if (result.success) {
        setWhatsappDialogOpen(false);
        setWhatsappMessage('');
      }
    } finally {
      setSendingWhatsapp(false);
    }
  };

  const getLatestMetrics = (pet: Pet) => {
    const metricsHistory = (pet.metrics_history as any[]) || [];
    if (metricsHistory.length === 0) return null;
    // Sort by date descending and return the most recent
    const sorted = [...metricsHistory].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
    return sorted[0];
  };

  const getWeightChartData = (pet: Pet): { date: string; weight: number }[] => {
    const metricsHistory = (pet.metrics_history as any[]) || [];
    // Filter only entries with weight and valid date, sort by date ascending for chart
    return metricsHistory
      .filter(m => {
        if (m.weight == null || !m.date) return false;
        const d = new Date(m.date);
        return !isNaN(d.getTime());
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(m => ({
        date: format(new Date(m.date), 'dd/MM/yy', { locale: he }),
        weight: m.weight
      }));
  };

  if (loading || !client) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">טוען...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 text-right">
        {/* Header */}
        <div className="flex items-center gap-4 flex-row-reverse">
          <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div className="flex-1 text-right">
            <h1 className="text-3xl font-bold">
              {client.first_name} {client.last_name}
            </h1>
            <p className="text-muted-foreground">תיק לקוח #{client.id.slice(0, 8)}</p>
          </div>
          <Button variant="outline" onClick={() => navigate(`/clients?edit=${client.id}`)}>
            <Edit className="h-4 w-4 ml-2" />
            ערוך פרטי לקוח
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Sidebar - Client Info & Stats */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg text-right">פרטי קשר</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-right">
              <div className="flex items-start gap-3 flex-row-reverse">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1 text-right flex-1">
                  <p className="text-sm font-medium">טלפון ראשי</p>
                  <p className="text-sm text-muted-foreground" dir="ltr">
                    {client.phone_primary}
                  </p>
                </div>
              </div>

              {/* WhatsApp Button */}
              {whatsappConfigured && whatsappEnabled && (
                <Dialog open={whatsappDialogOpen} onOpenChange={setWhatsappDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 text-green-600 border-green-200 hover:bg-green-50"
                    >
                      <MessageCircle className="h-4 w-4" />
                      שלח הודעת WhatsApp
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md" dir="rtl">
                    <DialogHeader>
                      <DialogTitle>שליחת הודעת WhatsApp</DialogTitle>
                      <DialogDescription>
                        שלח הודעה ל-{client.first_name} {client.last_name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">תוכן ההודעה</label>
                        <Textarea
                          placeholder="כתוב את ההודעה כאן..."
                          value={whatsappMessage}
                          onChange={(e) => setWhatsappMessage(e.target.value)}
                          rows={6}
                          className="resize-none text-right"
                        />
                      </div>
                      <Button
                        onClick={handleSendWhatsApp}
                        disabled={!whatsappMessage.trim() || sendingWhatsapp}
                        className="w-full gap-2 bg-green-600 hover:bg-green-700"
                      >
                        {sendingWhatsapp ? (
                          'שולח...'
                        ) : (
                          <>
                            <MessageCircle className="h-4 w-4" />
                            שלח
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {client.phone_secondary && (
                <div className="flex items-start gap-3 flex-row-reverse">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-1 text-right flex-1">
                    <p className="text-sm font-medium">טלפון משני</p>
                    <p className="text-sm text-muted-foreground" dir="ltr">
                      {client.phone_secondary}
                    </p>
                  </div>
                </div>
              )}

              {client.email && (
                <div className="flex items-start gap-3 flex-row-reverse">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-1 text-right flex-1">
                    <p className="text-sm font-medium">דוא״ל</p>
                    <p className="text-sm text-muted-foreground break-all">
                      {client.email}
                    </p>
                  </div>
                </div>
              )}

              {client.address && (
                <div className="flex items-start gap-3 flex-row-reverse">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-1 text-right flex-1">
                    <p className="text-sm font-medium">כתובת</p>
                    <p className="text-sm text-muted-foreground">{client.address}</p>
                  </div>
                </div>
              )}

              {client.notes && (
                <>
                  <Separator />
                  <div className="space-y-2 text-right">
                    <p className="text-sm font-medium">הערות</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {client.notes}
                    </p>
                  </div>
                </>
              )}

              <Separator />
              <div className="space-y-2 text-right">
                <p className="text-sm font-medium">סטטוס</p>
                <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                  {client.status === 'active' ? 'פעיל' : 'לא פעיל'}
                </Badge>
              </div>

              {/* Selected Pet Info - Right after client contact info */}
              {selectedPet && (
                <>
                  <Separator />
                  <div className="space-y-3 pt-2" dir="rtl">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-lg font-bold text-white">
                        {selectedPet.name.charAt(0)}
                      </div>
                      <div className="text-right flex-1">
                        <p className="font-semibold text-orange-800">{selectedPet.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedPet.species === 'dog' ? 'כלב' :
                           selectedPet.species === 'cat' ? 'חתול' :
                           selectedPet.species === 'bird' ? 'ציפור' :
                           selectedPet.species === 'rabbit' ? 'ארנב' :
                           selectedPet.species === 'hamster' ? 'אוגר' : selectedPet.species}
                          {selectedPet.breed && ` - ${selectedPet.breed}`}
                        </p>
                      </div>
                    </div>

                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
                      {/* מין */}
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">מין</span>
                        <Badge variant="outline" className="bg-white text-xs">
                          {selectedPet.sex === 'male' ? 'זכר' :
                           selectedPet.sex === 'female' ? 'נקבה' : 'לא ידוע'}
                        </Badge>
                      </div>

                      {/* גיל */}
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">גיל</span>
                        <Badge variant="outline" className="bg-white text-xs">
                          {selectedPet.birth_date ? (() => {
                            const birthDate = new Date(selectedPet.birth_date);
                            const now = new Date();
                            const years = Math.floor((now.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                            const months = Math.floor(((now.getTime() - birthDate.getTime()) % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
                            if (years > 0) return `${years} שנים`;
                            return `${months} חודשים`;
                          })() : 'לא ידוע'}
                        </Badge>
                      </div>

                      {/* סטטוס עיקור */}
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">עיקור</span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${selectedPet.neuter_status === 'neutered' ? 'bg-green-50 text-green-700 border-green-300' : 'bg-white'}`}
                        >
                          {selectedPet.neuter_status === 'neutered' ? 'מעוקר/מסורס' :
                           selectedPet.neuter_status === 'intact' ? 'לא מעוקר' : 'לא ידוע'}
                        </Badge>
                      </div>

                      {/* משקל */}
                      {selectedPet.current_weight && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">משקל</span>
                          <Badge variant="outline" className="bg-white text-xs">
                            {selectedPet.current_weight} ק״ג
                          </Badge>
                        </div>
                      )}

                      {/* סטטוס */}
                      <div className="flex justify-between items-center pt-1 border-t border-orange-200">
                        <span className="text-xs text-muted-foreground">סטטוס חיה</span>
                        <Badge className={`text-xs ${selectedPet.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}>
                          {selectedPet.status === 'active' ? 'פעיל' : 'לא פעיל'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Quick Stats */}
              <Separator />
              <div className="space-y-3 pt-2">
                <div className="text-center p-3 bg-primary/5 rounded-lg">
                  <Stethoscope className="h-6 w-6 mx-auto text-primary mb-1" />
                  <p className="text-xl font-bold">{pets.length}</p>
                  <p className="text-xs text-muted-foreground">חיות מחמד</p>
                </div>
                <div className="text-center p-3 bg-primary/5 rounded-lg">
                  <Calendar className="h-6 w-6 mx-auto text-primary mb-1" />
                  <p className="text-xl font-bold">
                    {Object.values(visitsByPet).flat().length}
                  </p>
                  <p className="text-xs text-muted-foreground">ביקורים</p>
                </div>
                <div className="text-center p-3 bg-primary/5 rounded-lg">
                  <FileText className="h-6 w-6 mx-auto text-primary mb-1" />
                  <p className="text-xl font-bold">
                    {Object.values(visitsByPet)
                      .flat()
                      .filter((v) => v.status === 'open').length}
                  </p>
                  <p className="text-xs text-muted-foreground">ביקורים פתוחים</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content - Pets and Visits */}
          <div className="lg:col-span-4 space-y-6">
            {/* Client-level Tabs (WhatsApp, Pets) */}
            <Tabs defaultValue="pets" className="w-full" dir="rtl">
              <TabsList className="grid w-full grid-cols-2 h-auto">
                <TabsTrigger value="pets" className="gap-2">
                  <Stethoscope className="h-4 w-4" />
                  חיות מחמד ({pets.length})
                </TabsTrigger>
                <TabsTrigger value="whatsapp" className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  שיחות WhatsApp
                </TabsTrigger>
              </TabsList>

              {/* WhatsApp Tab Content */}
              <TabsContent value="whatsapp" className="mt-6">
                <ClientWhatsAppChat
                  clientId={client.id}
                  clientName={`${client.first_name} ${client.last_name}`}
                  clientPhone={client.phone_primary}
                />
              </TabsContent>

              {/* Pets Tab Content */}
              <TabsContent value="pets" className="mt-6">
            {/* Pets Tabs */}
            {pets.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">אין חיות מחמד רשומות ללקוח זה</p>
                  <Button onClick={() => setPetDialogOpen(true)}>
                    <Plus className="h-4 w-4 ml-2" />
                    הוסף חיית מחמד
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue={pets[0]?.id} className="w-full" onValueChange={(value) => setSelectedPetId(value)}>
                <TabsList className="w-full h-auto gap-4 bg-transparent border-0 mb-6 flex flex-row-reverse justify-start">
                  {pets.map((pet) => (
                    <TabsTrigger
                      key={pet.id}
                      value={pet.id}
                      className="flex flex-col items-center gap-2 data-[state=active]:bg-transparent p-0 border-0 bg-transparent"
                    >
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors">
                          {pet.name.charAt(0)}
                        </div>
                        {visitsByPet[pet.id]?.length > 0 && (
                          <Badge
                            variant="secondary"
                            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full"
                          >
                            {visitsByPet[pet.id].length}
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm font-medium">{pet.name}</span>
                    </TabsTrigger>
                  ))}
                  {/* Add pet button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex flex-col items-center gap-2 h-auto py-2 px-4 border-dashed"
                    onClick={() => setPetDialogOpen(true)}
                  >
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center">
                      <Plus className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">הוסף חיה</span>
                  </Button>
                </TabsList>

                {pets.map((pet) => (
                  <TabsContent key={pet.id} value={pet.id} className="space-y-4 mt-6">
                    {/* Sub-tabs for each pet - Orange theme */}
                    <Tabs defaultValue="visits" className="w-full" dir="rtl">
                      <TabsList className="w-full grid grid-cols-6 h-auto bg-orange-100 border-2 border-orange-300 rounded-lg p-1">
                        <TabsTrigger value="details" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-orange-200 transition-colors">פרטי החיה</TabsTrigger>
                        <TabsTrigger value="metrics" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-orange-200 transition-colors">מדדים</TabsTrigger>
                        <TabsTrigger value="visits" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-orange-200 transition-colors">ציר זמן</TabsTrigger>
                        <TabsTrigger value="vaccinations" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-orange-200 transition-colors">חיסונים</TabsTrigger>
                        <TabsTrigger value="prescriptions" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-orange-200 transition-colors">מרשמים</TabsTrigger>
                        <TabsTrigger value="lab" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-orange-200 transition-colors">מסמכים מעבדה</TabsTrigger>
                      </TabsList>

                      {/* Pet Details Tab */}
                      <TabsContent value="details" className="mt-6">
                        <Card>
                          <CardHeader>
                            <div className="flex items-center justify-between" dir="rtl">
                              <CardTitle className="text-xl">פרטי {pet.name}</CardTitle>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={async () => {
                                  // Get form data from the form element
                                  const form = document.getElementById(`pet-details-form-${pet.id}`) as HTMLFormElement;
                                  if (!form) return;

                                  const formData = new FormData(form);
                                  const sexValue = formData.get(`sex-${pet.id}`) as string;
                                  const neuterCheckbox = form.querySelector(`input[name="neuter-${pet.id}"]`) as HTMLInputElement;

                                  const updateData = {
                                    name: formData.get('name') as string || pet.name,
                                    species: formData.get('species') as string || pet.species,
                                    breed: formData.get('breed') as string || null,
                                    sex: sexValue || pet.sex,
                                    color_markings: formData.get('color_markings') as string || null,
                                    birth_date: formData.get('birth_date') as string || null,
                                    microchip_number: formData.get('microchip_number') as string || null,
                                    license_number: formData.get('license_number') as string || null,
                                    neuter_status: neuterCheckbox?.checked ? 'neutered' : (pet.neuter_status === 'neutered' ? 'neutered' : 'intact'),
                                  };

                                  try {
                                    const { error } = await supabase
                                      .from('pets')
                                      .update(updateData)
                                      .eq('id', pet.id);

                                    if (error) throw error;

                                    toast({
                                      title: 'הצלחה',
                                      description: 'פרטי החיה נשמרו בהצלחה',
                                    });

                                    fetchClientData();
                                  } catch (error: any) {
                                    toast({
                                      title: 'שגיאה',
                                      description: error.message,
                                      variant: 'destructive',
                                    });
                                  }
                                }}
                              >
                                שמור שינויים
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <form id={`pet-details-form-${pet.id}`} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
                              {/* שם החיה */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">שם החיה: *</label>
                                <input
                                  type="text"
                                  name="name"
                                  defaultValue={pet.name}
                                  className="w-full px-3 py-2 border rounded-md text-right"
                                  placeholder="שם החיה"
                                />
                              </div>

                              {/* סוג החיה */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">סוג החיה:</label>
                                <select
                                  name="species"
                                  defaultValue={pet.species}
                                  className="w-full px-3 py-2 border rounded-md text-right"
                                >
                                  <option value="dog">כלב</option>
                                  <option value="cat">חתול</option>
                                  <option value="horse">סוס</option>
                                  <option value="other">אחר</option>
                                </select>
                              </div>

                              {/* גזע */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">גזע:</label>
                                <input
                                  type="text"
                                  name="breed"
                                  defaultValue={pet.breed || ''}
                                  className="w-full px-3 py-2 border rounded-md text-right"
                                  placeholder="גזע"
                                />
                              </div>

                              {/* מין */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">מין:</label>
                                <div className="flex gap-4 flex-row-reverse">
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name={`sex-${pet.id}`}
                                      value="male"
                                      defaultChecked={pet.sex === 'male'}
                                    />
                                    <span>זכר</span>
                                  </label>
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name={`sex-${pet.id}`}
                                      value="female"
                                      defaultChecked={pet.sex === 'female'}
                                    />
                                    <span>נקבה</span>
                                  </label>
                                </div>
                              </div>

                              {/* צבע */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">צבע:</label>
                                <input
                                  type="text"
                                  name="color_markings"
                                  defaultValue={pet.color_markings || ''}
                                  className="w-full px-3 py-2 border rounded-md text-right"
                                  placeholder="צבע"
                                />
                              </div>

                              {/* מעוקר/מסורס */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">מעוקר/מסורס:</label>
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="checkbox"
                                    name={`neuter-${pet.id}`}
                                    defaultChecked={pet.neuter_status === 'neutered'}
                                    className="w-4 h-4"
                                  />
                                  <span className="text-sm">מעוקר/מסורס</span>
                                </div>
                              </div>

                              {/* תאריך לידה */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">תאריך לידה:</label>
                                <input
                                  type="date"
                                  name="birth_date"
                                  defaultValue={pet.birth_date || ''}
                                  className="w-full px-3 py-2 border rounded-md text-right"
                                />
                                {pet.birth_date && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    גיל: {Math.floor((new Date().getTime() - new Date(pet.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} שנים
                                  </p>
                                )}
                              </div>

                              {/* מספר שבב */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">מספר שבב:</label>
                                <input
                                  type="text"
                                  name="microchip_number"
                                  defaultValue={pet.microchip_number || ''}
                                  className="w-full px-3 py-2 border rounded-md text-right"
                                  placeholder="מספר שבב"
                                />
                              </div>

                              {/* מספר לוחית */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">מספר לוחית:</label>
                                <input
                                  type="text"
                                  name="license_number"
                                  defaultValue={pet.license_number || ''}
                                  className="w-full px-3 py-2 border rounded-md text-right"
                                  placeholder="מספר לוחית"
                                />
                              </div>
                            </form>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Metrics Tab */}
                      <TabsContent value="metrics" className="mt-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-right">מדדים</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6 text-right">
                            {/* Latest Measurements */}
                            <div className="space-y-4">
                              <div className="flex items-center justify-between flex-row-reverse">
                                <h3 className="font-semibold">נתונים אחרונים שנמדדו:</h3>
                                <Button
                                  variant="link"
                                  size="sm"
                                  onClick={() => setShowWeightChart(prev => ({
                                    ...prev,
                                    [pet.id]: !prev[pet.id]
                                  }))}
                                >
                                  <TrendingUp className="h-4 w-4 ml-1" />
                                  {showWeightChart[pet.id] ? 'הסתר גרף' : 'לחץ לקבלת גרף'}
                                </Button>
                              </div>

                              {/* Weight Chart */}
                              {showWeightChart[pet.id] && (() => {
                                const chartData = getWeightChartData(pet);
                                if (chartData.length === 0) {
                                  return (
                                    <div className="p-4 bg-muted/30 rounded-lg text-center">
                                      <p className="text-muted-foreground">אין נתוני משקל להצגת גרף</p>
                                    </div>
                                  );
                                }
                                const maxWeight = Math.max(...chartData.map(d => d.weight));
                                const minWeight = Math.min(...chartData.map(d => d.weight));
                                const chartMin = minWeight === maxWeight ? minWeight * 0.8 : minWeight * 0.95;
                                const chartMax = minWeight === maxWeight ? maxWeight * 1.2 : maxWeight * 1.05;
                                const range = chartMax - chartMin || 1;
                                const chartHeight = 150;
                                const chartWidth = Math.max(chartData.length * 60, 300);

                                // Calculate points for the line
                                const points = chartData.map((d, idx) => {
                                  const x = (idx / (chartData.length - 1 || 1)) * (chartWidth - 40) + 20;
                                  const y = chartHeight - ((d.weight - chartMin) / range) * (chartHeight - 20) - 10;
                                  return { x, y, weight: d.weight, date: d.date };
                                });

                                // Create SVG path
                                const linePath = points.map((p, idx) =>
                                  `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
                                ).join(' ');

                                return (
                                  <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                                    <h4 className="text-sm font-medium text-center">מגמת משקל</h4>
                                    <div className="overflow-x-auto">
                                      <svg
                                        width={chartWidth}
                                        height={chartHeight + 40}
                                        className="mx-auto"
                                      >
                                        {/* Grid lines */}
                                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => (
                                          <line
                                            key={idx}
                                            x1={20}
                                            y1={chartHeight - ratio * (chartHeight - 20) - 10}
                                            x2={chartWidth - 20}
                                            y2={chartHeight - ratio * (chartHeight - 20) - 10}
                                            stroke="currentColor"
                                            strokeOpacity={0.1}
                                          />
                                        ))}

                                        {/* Line */}
                                        <path
                                          d={linePath}
                                          fill="none"
                                          stroke="hsl(var(--primary))"
                                          strokeWidth={2}
                                        />

                                        {/* Points and labels */}
                                        {points.map((p, idx) => (
                                          <g key={idx}>
                                            <circle
                                              cx={p.x}
                                              cy={p.y}
                                              r={5}
                                              fill="hsl(var(--primary))"
                                              className="cursor-pointer hover:r-7"
                                            >
                                              <title>{`${p.date}: ${p.weight} ק"ג`}</title>
                                            </circle>
                                            <text
                                              x={p.x}
                                              y={p.y - 10}
                                              textAnchor="middle"
                                              fontSize={10}
                                              fill="hsl(var(--primary))"
                                              fontWeight="bold"
                                            >
                                              {p.weight}
                                            </text>
                                            <text
                                              x={p.x}
                                              y={chartHeight + 20}
                                              textAnchor="middle"
                                              fontSize={9}
                                              fill="currentColor"
                                              opacity={0.6}
                                            >
                                              {p.date}
                                            </text>
                                          </g>
                                        ))}
                                      </svg>
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center">
                                      משקל בק"ג
                                    </p>
                                  </div>
                                );
                              })()}

                              {(() => {
                                const latestMetrics = getLatestMetrics(pet);
                                return (
                                  <div className="grid grid-cols-2 gap-4 p-4 bg-accent/5 rounded-lg">
                                    <div>
                                      <p className="text-sm text-muted-foreground">משקל:</p>
                                      <p className="font-medium">
                                        {latestMetrics?.weight ? `${latestMetrics.weight} ק"ג` : '—'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">טמפרטורה:</p>
                                      <p className="font-medium">
                                        {latestMetrics?.temperature ? `${latestMetrics.temperature} °C` : '—'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">קצב לב:</p>
                                      <p className="font-medium">
                                        {latestMetrics?.heart_rate || '—'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">קצב נשימות:</p>
                                      <p className="font-medium">
                                        {latestMetrics?.respiration_rate || '—'}
                                      </p>
                                    </div>
                                    <div className="col-span-2">
                                      <p className="text-sm text-muted-foreground">לחץ דם:</p>
                                      <p className="font-medium">
                                        {latestMetrics?.blood_pressure || '—'}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Add New Measurements */}
                            <div className="space-y-4 p-4 border rounded-lg">
                              <h3 className="font-semibold">הוסף נתונים:</h3>
                              
                              <div>
                                <label className="text-sm font-medium mb-2 block">תאריך:</label>
                                <input
                                  type="date"
                                  value={newMetrics[pet.id]?.date || new Date().toISOString().split('T')[0]}
                                  onChange={(e) => setNewMetrics(prev => ({
                                    ...prev,
                                    [pet.id]: { ...(prev[pet.id] || {}), date: e.target.value } as any
                                  }))}
                                  className="w-full px-3 py-2 border rounded-md text-right"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium mb-2 block">משקל:</label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      step="0.1"
                                      value={newMetrics[pet.id]?.weight || ''}
                                      onChange={(e) => setNewMetrics(prev => ({
                                        ...prev,
                                        [pet.id]: { ...(prev[pet.id] || {}), weight: e.target.value } as any
                                      }))}
                                      className="flex-1 px-3 py-2 border rounded-md text-right"
                                      placeholder="0.0"
                                    />
                                    <span className="text-sm text-muted-foreground">ק"ג</span>
                                  </div>
                                </div>

                                <div>
                                  <label className="text-sm font-medium mb-2 block">טמפרטורה:</label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      step="0.1"
                                      value={newMetrics[pet.id]?.temperature || ''}
                                      onChange={(e) => setNewMetrics(prev => ({
                                        ...prev,
                                        [pet.id]: { ...(prev[pet.id] || {}), temperature: e.target.value } as any
                                      }))}
                                      className="flex-1 px-3 py-2 border rounded-md text-right"
                                      placeholder="0.0"
                                    />
                                    <span className="text-sm text-muted-foreground">°C</span>
                                  </div>
                                </div>

                                <div>
                                  <label className="text-sm font-medium mb-2 block">קצב לב:</label>
                                  <input
                                    type="number"
                                    value={newMetrics[pet.id]?.heart_rate || ''}
                                    onChange={(e) => setNewMetrics(prev => ({
                                      ...prev,
                                      [pet.id]: { ...(prev[pet.id] || {}), heart_rate: e.target.value } as any
                                    }))}
                                    className="w-full px-3 py-2 border rounded-md text-right"
                                    placeholder="0"
                                  />
                                </div>

                                <div>
                                  <label className="text-sm font-medium mb-2 block">קצב נשימות:</label>
                                  <input
                                    type="number"
                                    value={newMetrics[pet.id]?.respiration_rate || ''}
                                    onChange={(e) => setNewMetrics(prev => ({
                                      ...prev,
                                      [pet.id]: { ...(prev[pet.id] || {}), respiration_rate: e.target.value } as any
                                    }))}
                                    className="w-full px-3 py-2 border rounded-md text-right"
                                    placeholder="0"
                                  />
                                </div>

                                <div className="col-span-2">
                                  <label className="text-sm font-medium mb-2 block">לחץ דם:</label>
                                  <input
                                    type="text"
                                    value={newMetrics[pet.id]?.blood_pressure || ''}
                                    onChange={(e) => setNewMetrics(prev => ({
                                      ...prev,
                                      [pet.id]: { ...(prev[pet.id] || {}), blood_pressure: e.target.value } as any
                                    }))}
                                    className="w-full px-3 py-2 border rounded-md text-right"
                                    placeholder="120/80"
                                  />
                                </div>
                              </div>

                              <Button 
                                className="w-full"
                                onClick={() => handleSaveMetrics(pet.id)}
                              >
                                שמור מדדים
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Visits/Timeline Tab */}
                      <TabsContent value="visits" className="mt-6">
                        {(showNewVisitForm && selectedPetForNewVisit === pet.id) || (editingVisit && editingVisit.pet_id === pet.id) ? (
                          <Card className="mb-6">
                            <CardContent className="p-4">
                              <VisitForm
                                onSave={editingVisit ? handleEditVisit : handleNewVisit}
                                onCancel={() => {
                                  setShowNewVisitForm(false);
                                  setSelectedPetForNewVisit(null);
                                  setEditingVisit(null);
                                }}
                                visit={editingVisit}
                                preSelectedClientId={client.id}
                                preSelectedPetId={pet.id}
                              />
                            </CardContent>
                          </Card>
                        ) : (
                          <PetTimeline
                            clientId={client.id}
                            petId={pet.id}
                            petName={pet.name}
                            onNewVisit={() => {
                              setSelectedPetForNewVisit(pet.id);
                              setShowNewVisitForm(true);
                              setEditingVisit(null);
                            }}
                            onEditVisit={(visit) => {
                              setEditingVisit(visit);
                              setSelectedPetForNewVisit(null);
                              setShowNewVisitForm(false);
                            }}
                            onExportPDF={handleExportPDF}
                          />
                        )}
                      </TabsContent>

                      {/* Vaccinations Tab */}
                      <TabsContent value="vaccinations" className="mt-6" dir="rtl">
                        <Card>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle>חיסונים</CardTitle>
                              <Button
                                size="sm"
                                onClick={() => setShowVaccinationForm(showVaccinationForm === pet.id ? null : pet.id)}
                              >
                                <Plus className="h-4 w-4 ml-2" />
                                הוסף חיסון
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {/* טופס הוספת חיסון */}
                            {showVaccinationForm === pet.id && (
                              <div className="mb-6 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="font-medium text-blue-800 flex items-center gap-2">
                                    <Syringe className="h-4 w-4" />
                                    הוספת חיסון חדש
                                  </h4>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowVaccinationForm(null)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                  <div className="space-y-2">
                                    <Label>סוג החיסון</Label>
                                    <Select
                                      value={vaccinationForm.vaccination_type}
                                      onValueChange={(value) => setVaccinationForm(prev => ({ ...prev, vaccination_type: value }))}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="בחר סוג חיסון" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {(() => {
                                          const species = pet.species?.toLowerCase() || 'other';
                                          const vaccineList = species.includes('כלב') || species.includes('dog')
                                            ? VACCINATION_TYPES.dog
                                            : species.includes('חתול') || species.includes('cat')
                                            ? VACCINATION_TYPES.cat
                                            : VACCINATION_TYPES.other;
                                          return vaccineList.map((vaccine) => (
                                            <SelectItem key={vaccine.value} value={vaccine.value}>
                                              {vaccine.label}
                                            </SelectItem>
                                          ));
                                        })()}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>תאריך החיסון</Label>
                                    <Input
                                      type="date"
                                      value={vaccinationForm.vaccination_date}
                                      onChange={(e) => setVaccinationForm(prev => ({ ...prev, vaccination_date: e.target.value }))}
                                    />
                                  </div>
                                </div>

                                {/* תצוגת תאריך חיסון הבא */}
                                {vaccinationForm.vaccination_type && vaccinationForm.vaccination_date && (() => {
                                  const species = pet.species?.toLowerCase() || 'other';
                                  const vaccineList = species.includes('כלב') || species.includes('dog')
                                    ? VACCINATION_TYPES.dog
                                    : species.includes('חתול') || species.includes('cat')
                                    ? VACCINATION_TYPES.cat
                                    : VACCINATION_TYPES.other;
                                  const selectedVaccine = vaccineList.find(v => v.value === vaccinationForm.vaccination_type);

                                  if (selectedVaccine) {
                                    const vaccinationDate = new Date(vaccinationForm.vaccination_date);
                                    const nextVaccinationDate = addDays(vaccinationDate, selectedVaccine.nextDueDays);

                                    return (
                                      <div className="bg-green-100 border border-green-300 rounded-lg p-3 mb-4">
                                        <div className="flex items-center gap-2 text-green-800 flex-wrap">
                                          <Calendar className="h-4 w-4" />
                                          <span className="font-medium">חיסון הבא:</span>
                                          <span className="font-bold">
                                            {format(nextVaccinationDate, 'dd/MM/yyyy', { locale: he })}
                                          </span>
                                          <span className="text-sm text-green-600">
                                            ({selectedVaccine.nextDueDays === 365 ? 'שנה' : selectedVaccine.nextDueDays === 180 ? '6 חודשים' : `${selectedVaccine.nextDueDays} ימים`})
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}

                                {/* אפשרות לדלג על תזכורת */}
                                <div className="flex items-center gap-2 mb-4">
                                  <Checkbox
                                    id={`skip-reminder-${pet.id}`}
                                    checked={vaccinationForm.skip_reminder}
                                    onCheckedChange={(checked) =>
                                      setVaccinationForm(prev => ({ ...prev, skip_reminder: checked === true }))
                                    }
                                  />
                                  <Label
                                    htmlFor={`skip-reminder-${pet.id}`}
                                    className="text-sm text-muted-foreground cursor-pointer"
                                  >
                                    אין צורך בתזכורת (עדכון רטרואקטיבי)
                                  </Label>
                                </div>

                                <Button
                                  onClick={() => handleSaveVaccination(pet.id)}
                                  className="w-full"
                                >
                                  <Syringe className="h-4 w-4 ml-2" />
                                  שמור חיסון
                                </Button>
                              </div>
                            )}

                            {/* רשימת חיסונים */}
                            {(() => {
                              const vaccinationVisits = visitsByPet[pet.id]?.filter(
                                (visit) => visit.visit_type?.startsWith('vaccination:')
                              ) || [];

                              if (vaccinationVisits.length === 0 && showVaccinationForm !== pet.id) {
                                return (
                                  <p className="text-center text-muted-foreground py-8">
                                    אין רשומות חיסונים
                                  </p>
                                );
                              }

                              const sortedVaccinations = [...vaccinationVisits].sort(
                                (a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
                              );

                              return (
                                <div className="space-y-3">
                                  {sortedVaccinations.map((visit) => {
                                    const parts = visit.visit_type.split(':');
                                    const vaccineName = parts[2] || parts[1] || 'חיסון';

                                    return (
                                      <div
                                        key={visit.id}
                                        className="flex items-center justify-between p-4 border rounded-lg bg-green-50 border-green-200"
                                      >
                                        <div className="text-right">
                                          <p className="font-medium text-green-800">{vaccineName}</p>
                                          <p className="text-sm text-muted-foreground">
                                            {format(new Date(visit.visit_date), 'dd/MM/yyyy', { locale: he })}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                                            בוצע
                                          </Badge>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Prescriptions Tab */}
                      <TabsContent value="prescriptions" className="mt-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-right">מרשמים</CardTitle>
                          </CardHeader>
                          <CardContent className="text-right">
                            {visitsByPet[pet.id] && visitsByPet[pet.id].length > 0 ? (
                              <div className="space-y-4">
                                {visitsByPet[pet.id]
                                  .filter((visit) => Array.isArray(visit.medications) && visit.medications.length > 0)
                                  .map((visit) => (
                                    <div key={visit.id} className="border rounded-lg p-4">
                                      <div className="flex items-center justify-between mb-3 flex-row-reverse">
                                        <div className="text-right">
                                          <p className="font-medium">{visit.visit_type}</p>
                                          <p className="text-sm text-muted-foreground">
                                            {format(new Date(visit.visit_date), 'dd/MM/yyyy', { locale: he })}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        {Array.isArray(visit.medications) && visit.medications.map((m: any, idx: number) => (
                                          <div key={idx} className="bg-accent/20 rounded p-3 text-right">
                                            <p className="font-medium">{m.medication}</p>
                                            {m.dosage && (
                                              <p className="text-sm text-muted-foreground mt-1">
                                                מינון: {m.dosage}
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <p className="text-center text-muted-foreground py-8">אין מרשמים רשומים</p>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Lab Documents Tab */}
                      <TabsContent value="lab" className="mt-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-right">מסמכים מעבדה</CardTitle>
                          </CardHeader>
                          <CardContent className="text-right">
                            <p className="text-center text-muted-foreground py-8">
                              מסמכי מעבדה יופיעו כאן
                            </p>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </TabsContent>
                ))}
              </Tabs>
            )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Pet Dialog */}
      <PetDialog
        open={petDialogOpen}
        onClose={() => setPetDialogOpen(false)}
        onSave={handlePetSave}
        defaultClientId={client.id}
      />
    </DashboardLayout>
  );
};

export default ClientProfile;
