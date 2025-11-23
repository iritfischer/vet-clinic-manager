import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ArrowRight, Phone, Mail, MapPin, Edit, Plus, Calendar, Stethoscope, FileText, Download, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useClinic } from '@/hooks/useClinic';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { VisitForm } from '@/components/visits/VisitForm';
import { PetTimeline } from '@/components/clients/PetTimeline';

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
  const [client, setClient] = useState<Client | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [visitsByPet, setVisitsByPet] = useState<Record<string, Visit[]>>({});
  const [loading, setLoading] = useState(true);
  const [showNewVisitForm, setShowNewVisitForm] = useState(false);
  const [selectedPetForNewVisit, setSelectedPetForNewVisit] = useState<string | null>(null);
  const [newMetrics, setNewMetrics] = useState<Record<string, {
    date: string;
    weight: string;
    temperature: string;
    heart_rate: string;
    respiration_rate: string;
    blood_pressure: string;
  }>>({});
  const [showWeightChart, setShowWeightChart] = useState<Record<string, boolean>>({});

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
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Fetch pets
      const { data: petsData, error: petsError } = await supabase
        .from('pets')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (petsError) throw petsError;
      setPets(petsData || []);

      // Fetch visits for all pets
      if (petsData && petsData.length > 0) {
        const { data: visitsData, error: visitsError } = await supabase
          .from('visits')
          .select('*, pets:pet_id(*)')
          .eq('client_id', clientId)
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

      // Extract follow_ups and price_items separately
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
        const priceItemsToInsert = price_items.map((item: any) => ({
          visit_id: visit.id,
          price_item_id: item.item_id,
          quantity: item.quantity,
          clinic_id: clinicId,
          price_at_time: 0,
        }));

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

  const getWeightChartData = (pet: Pet) => {
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

  const statusConfig = {
    open: { label: 'פתוח', variant: 'default' as const },
    completed: { label: 'הושלם', variant: 'secondary' as const },
    cancelled: { label: 'בוטל', variant: 'destructive' as const },
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
            {/* Pets Tabs */}
            {pets.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">אין חיות מחמד רשומות ללקוח זה</p>
                  <Button onClick={() => navigate(`/pets?client=${client.id}`)}>
                    <Plus className="h-4 w-4 ml-2" />
                    הוסף חיית מחמד
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue={pets[0]?.id} className="w-full">
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
                </TabsList>

                {pets.map((pet) => (
                  <TabsContent key={pet.id} value={pet.id} className="space-y-4 mt-6">
                    {/* Sub-tabs for each pet */}
                    <Tabs defaultValue="visits" className="w-full" dir="rtl">
                      <TabsList className="w-full grid grid-cols-6 h-auto bg-muted/50">
                        <TabsTrigger value="details">פרטי החיה</TabsTrigger>
                        <TabsTrigger value="metrics">מדדים</TabsTrigger>
                        <TabsTrigger value="visits">ציר זמן</TabsTrigger>
                        <TabsTrigger value="vaccinations">חיסונים</TabsTrigger>
                        <TabsTrigger value="prescriptions">מרשמים</TabsTrigger>
                        <TabsTrigger value="lab">מסמכים מעבדה</TabsTrigger>
                      </TabsList>

                      {/* Pet Details Tab */}
                      <TabsContent value="details" className="mt-6">
                        <Card>
                          <CardHeader>
                            <div className="flex items-center justify-between flex-row-reverse">
                              <CardTitle className="text-xl text-right">פרטי {pet.name}</CardTitle>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  // Save logic will be added
                                  toast({
                                    title: 'הצלחה',
                                    description: 'הפרטים נשמרו בהצלחה',
                                  });
                                }}
                              >
                                שמור שינויים
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
                              {/* שם החיה */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">שם החיה: *</label>
                                <input
                                  type="text"
                                  defaultValue={pet.name}
                                  className="w-full px-3 py-2 border rounded-md text-right"
                                  placeholder="שם החיה"
                                />
                              </div>

                              {/* סוג החיה */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">סוג החיה:</label>
                                <select
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
                                  defaultValue={pet.color_markings || ''}
                                  className="w-full px-3 py-2 border rounded-md text-right"
                                  placeholder="צבע"
                                />
                              </div>

                              {/* מעוקר/מסורס */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">מעוקר/מסורס:</label>
                                <div className="flex gap-2">
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4"
                                  />
                                  <span className="text-sm">בתאריך:</span>
                                  <input
                                    type="date"
                                    className="flex-1 px-3 py-2 border rounded-md text-right"
                                  />
                                </div>
                              </div>

                              {/* תאריך לידה */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">תאריך לידה:</label>
                                <input
                                  type="date"
                                  defaultValue={pet.birth_date || ''}
                                  className="w-full px-3 py-2 border rounded-md text-right"
                                />
                                {pet.birth_date && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    גיל: {Math.floor((new Date().getTime() - new Date(pet.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} שנים
                                  </p>
                                )}
                              </div>

                              {/* פטור מאגרה */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">פטור מאגרה:</label>
                                <select className="w-full px-3 py-2 border rounded-md text-right">
                                  <option value="">בחר סיבה</option>
                                  <option value="senior">גיל מבוגר</option>
                                  <option value="disability">נכות</option>
                                  <option value="other">אחר</option>
                                </select>
                              </div>

                              {/* מספר שבב */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">מספר שבב:</label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    defaultValue={pet.microchip_number || ''}
                                    className="flex-1 px-3 py-2 border rounded-md text-right"
                                    placeholder="מספר שבב"
                                  />
                                  <span className="text-sm whitespace-nowrap self-center">הוכנס בתאריך:</span>
                                  <input
                                    type="date"
                                    className="px-3 py-2 border rounded-md text-right"
                                  />
                                </div>
                              </div>

                              {/* מספר לוחית */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">מספר לוחית:</label>
                                <input
                                  type="text"
                                  defaultValue={pet.license_number || ''}
                                  className="w-full px-3 py-2 border rounded-md text-right"
                                  placeholder="מספר לוחית"
                                />
                              </div>

                              {/* מספר סגיר */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">מספר סגיר:</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border rounded-md text-right"
                                  placeholder="מספר סגיר"
                                />
                              </div>

                              {/* סוג דם */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">סוג דם:</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border rounded-md text-right"
                                  placeholder="סוג דם"
                                />
                              </div>

                              {/* מחירון */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">מחירון:</label>
                                <select className="w-full px-3 py-2 border rounded-md text-right">
                                  <option value="">בחר מחירון</option>
                                  <option value="standard">מחירון רגיל</option>
                                  <option value="premium">מחירון פרימיום</option>
                                </select>
                              </div>

                              {/* סוג מזון */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">סוג מזון:</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border rounded-md text-right"
                                  placeholder="סוג מזון"
                                />
                              </div>

                              {/* הערות */}
                              <div className="md:col-span-2">
                                <label className="text-sm font-medium mb-2 block">הערות:</label>
                                <textarea
                                  maxLength={250}
                                  rows={3}
                                  className="w-full px-3 py-2 border rounded-md text-right resize-none"
                                  placeholder="הערות"
                                />
                                <p className="text-xs text-muted-foreground mt-1">נותרו 250 תווים</p>
                              </div>

                              {/* מתפרצת */}
                              <div className="md:col-span-2">
                                <div className="flex items-center gap-2 mb-2">
                                  <input type="checkbox" className="w-4 h-4" />
                                  <label className="text-sm font-medium">מתפרצת</label>
                                </div>
                                <textarea
                                  maxLength={250}
                                  rows={2}
                                  className="w-full px-3 py-2 border rounded-md text-right resize-none"
                                  placeholder="הערה מתפרצת"
                                />
                                <p className="text-xs text-muted-foreground mt-1">נותרו 250 תווים</p>
                              </div>

                              {/* רגישות */}
                              <div>
                                <div className="flex items-center gap-2">
                                  <input type="checkbox" className="w-4 h-4" />
                                  <label className="text-sm font-medium">רגישות</label>
                                </div>
                              </div>

                              {/* חיה לא פעילה */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">חיה לא פעילה:</label>
                                <select className="w-full px-3 py-2 border rounded-md text-right">
                                  <option value="">בחר סיבה</option>
                                  <option value="deceased">נפטר</option>
                                  <option value="sold">נמכר</option>
                                  <option value="other">אחר</option>
                                </select>
                              </div>

                              {/* תאריך אחרון לשליחת תיק חיה */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">תאריך אחרון לשליחת תיק חיה:</label>
                                <input
                                  type="date"
                                  className="w-full px-3 py-2 border rounded-md text-right"
                                />
                              </div>

                              {/* לקוח מבוטח */}
                              <div className="md:col-span-2">
                                <div className="flex items-center gap-4 flex-row-reverse">
                                  <div className="flex items-center gap-2">
                                    <input type="checkbox" className="w-4 h-4" />
                                    <label className="text-sm font-medium">לקוח מבוטח</label>
                                  </div>
                                  <div className="flex-1 flex items-center gap-2">
                                    <span className="text-sm">שם הביטוח:</span>
                                    <input
                                      type="text"
                                      className="flex-1 px-3 py-2 border rounded-md text-right"
                                      placeholder="שם הביטוח"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* הועברה בעלות מ */}
                              <div className="md:col-span-2">
                                <label className="text-sm font-medium mb-2 block">הועברה בעלות מ:</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border rounded-md text-right"
                                  placeholder="שם הבעלים הקודם"
                                />
                              </div>
                            </div>
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
                                        dir="ltr"
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
                        {showNewVisitForm && selectedPetForNewVisit === pet.id ? (
                          <Card className="mb-6">
                            <CardContent className="p-4">
                              <VisitForm
                                onSave={handleNewVisit}
                                onCancel={() => {
                                  setShowNewVisitForm(false);
                                  setSelectedPetForNewVisit(null);
                                }}
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
                            }}
                            onExportPDF={handleExportPDF}
                          />
                        )}
                      </TabsContent>

                      {/* Vaccinations Tab */}
                      <TabsContent value="vaccinations" className="mt-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-right">חיסונים</CardTitle>
                          </CardHeader>
                          <CardContent className="text-right">
                            <p className="text-center text-muted-foreground py-8">
                              רשומות חיסונים יופיעו כאן
                            </p>
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
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ClientProfile;
