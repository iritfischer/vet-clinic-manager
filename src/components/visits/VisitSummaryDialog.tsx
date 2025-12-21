import { useState, useEffect, useRef } from 'react';
import { Tables } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';
import { useTags } from '@/hooks/useTags';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Send, Eye, Edit, Save } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInYears, differenceInMonths } from 'date-fns';
import { he } from 'date-fns/locale';

import { VisitSummaryPreview } from './VisitSummaryPreview';
import { VisitSummaryEditor } from './VisitSummaryEditor';
import { VisitSummaryData, VisitWithRelations, DiagnosisItem, TreatmentItem, MedicationItem, ChargeItem, VaccinationItem } from '@/lib/visitSummaryTypes';
import { downloadVisitPdfFromData, openWhatsAppWithPdfFromData } from '@/lib/generateVisitPdf';

interface VisitSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit: VisitWithRelations | null;
}

export const VisitSummaryDialog = ({ open, onOpenChange, visit }: VisitSummaryDialogProps) => {
  const { clinicId } = useClinic();
  const { getTagLabel: getDiagnosisLabel } = useTags('diagnosis');
  const { getTagLabel: getTreatmentLabel } = useTags('treatment');
  const { getTagLabel: getMedicationLabel } = useTags('medication');
  const [clinic, setClinic] = useState<Tables<'clinics'> | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('preview');
  const [summaryData, setSummaryData] = useState<VisitSummaryData | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Wrapper for setSummaryData that tracks dirty state
  const handleSummaryDataChange = (data: VisitSummaryData) => {
    setSummaryData(data);
    setIsDirty(true);
  };

  // Save changes back to the visit
  const saveChangesToVisit = async () => {
    if (!visit || !summaryData) return false;

    setIsSaving(true);
    try {
      // Transform summaryData back to visit format
      // Convert formatted dates back to ISO format for vaccinations
      const vaccinationsForDb = summaryData.vaccinations?.map(v => ({
        vaccination_type: v.vaccination_type,
        vaccination_date: v.vaccination_date ? v.vaccination_date.split('/').reverse().join('-') : null,
        next_vaccination_date: v.next_vaccination_date ? v.next_vaccination_date.split('/').reverse().join('-') : null,
      }));

      const updateData = {
        general_history: summaryData.generalHistory || null,
        medical_history: summaryData.medicalHistory || null,
        current_history: summaryData.currentHistory || null,
        physical_exam: summaryData.physicalExam || null,
        diagnoses: summaryData.diagnoses.length > 0 ? summaryData.diagnoses : null,
        treatments: summaryData.treatments.length > 0 ? summaryData.treatments : null,
        medications: summaryData.medications.length > 0 ? summaryData.medications : null,
        vaccinations: vaccinationsForDb && vaccinationsForDb.length > 0 ? vaccinationsForDb : null,
        recommendations: summaryData.recommendations || null,
        client_summary: summaryData.notesToOwner || null,
      };

      console.log('[VisitSummaryDialog] Saving changes to visit:', { visitId: visit.id, updateData });

      const { error } = await supabase
        .from('visits')
        .update(updateData)
        .eq('id', visit.id);

      if (error) {
        console.error('[VisitSummaryDialog] Save error:', error);
        toast.error('שגיאה בשמירת השינויים');
        return false;
      }

      console.log('[VisitSummaryDialog] Save successful');
      toast.success('השינויים נשמרו בהצלחה');
      setIsDirty(false);
      return true;
    } catch (err) {
      console.error('[VisitSummaryDialog] Exception during save:', err);
      toast.error('שגיאה בשמירת השינויים');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Handle dialog close with dirty check
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isDirty) {
      if (!confirm('יש שינויים שלא נשמרו. האם לצאת בכל זאת?')) {
        return;
      }
    }
    if (!newOpen) {
      setIsDirty(false);
    }
    onOpenChange(newOpen);
  };

  // Fetch clinic data
  useEffect(() => {
    const fetchClinic = async () => {
      if (!clinicId) return;

      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', clinicId)
        .single();

      if (!error && data) {
        setClinic(data);
      }
    };

    if (open) {
      fetchClinic();
    }
  }, [clinicId, open]);

  // Calculate pet age
  const calculateAge = (birthDate: string | null): string | undefined => {
    if (!birthDate) return undefined;

    const birth = new Date(birthDate);
    const now = new Date();
    const years = differenceInYears(now, birth);

    if (years >= 1) {
      return `${years} שנים`;
    }

    const months = differenceInMonths(now, birth);
    return `${months} חודשים`;
  };

  // Initialize summary data from visit
  useEffect(() => {
    if (!visit || !clinic) return;

    const initializeSummaryData = async () => {
      const diagnoses: DiagnosisItem[] = Array.isArray(visit.diagnoses)
        ? (visit.diagnoses as any[]).map((d) => ({
            diagnosis: getDiagnosisLabel(d.diagnosis || ''),
            notes: d.notes || '',
          }))
        : [];

      const treatments: TreatmentItem[] = Array.isArray(visit.treatments)
        ? (visit.treatments as any[]).map((t) => ({
            treatment: getTreatmentLabel(t.treatment || ''),
            notes: t.notes || '',
          }))
        : [];

      const medications: MedicationItem[] = Array.isArray(visit.medications)
        ? (visit.medications as any[]).map((m) => ({
            medication: getMedicationLabel(m.medication || ''),
            dosage: m.dosage || '',
            frequency: m.frequency || '',
            duration: m.duration || '',
            quantity: m.quantity || 1,
          }))
        : [];

      const vaccinations: VaccinationItem[] = Array.isArray(visit.vaccinations)
        ? (visit.vaccinations as any[]).map((v) => ({
            vaccination_type: v.vaccination_type || '',
            vaccination_date: v.vaccination_date ? format(new Date(v.vaccination_date), 'dd/MM/yyyy', { locale: he }) : '',
            next_vaccination_date: v.next_vaccination_date ? format(new Date(v.next_vaccination_date), 'dd/MM/yyyy', { locale: he }) : undefined,
          }))
        : [];

      const ownerName = visit.clients
        ? `${visit.clients.first_name} ${visit.clients.last_name}`
        : 'לא ידוע';

      // Fetch visit charges
      let charges: ChargeItem[] = [];
      let totalAmount = 0;

      try {
        // First, get the visit_price_items
        const { data: visitPriceItems, error: chargesError } = await supabase
          .from('visit_price_items')
          .select('*')
          .eq('visit_id', visit.id);

        if (chargesError) {
          console.error('Error fetching visit_price_items:', chargesError);
        }

        if (visitPriceItems && visitPriceItems.length > 0) {
          // Get unique price_item_ids to fetch their details
          const priceItemIds = [...new Set(visitPriceItems.map(item => item.price_item_id))];

          // Fetch price_items details
          const { data: priceItemsData } = await supabase
            .from('price_items')
            .select('id, name, price_with_vat')
            .in('id', priceItemIds);

          // Map to create charges array
          charges = visitPriceItems.map((item: any) => {
            const priceItem = priceItemsData?.find(p => p.id === item.price_item_id);
            // Use price_at_time if available, otherwise use current price from price_items
            const price = item.price_at_time > 0
              ? item.price_at_time
              : (priceItem?.price_with_vat || 0);
            return {
              name: priceItem?.name || 'פריט לא ידוע',
              quantity: item.quantity,
              pricePerUnit: price,
              total: item.quantity * price,
            };
          });
          totalAmount = charges.reduce((sum, item) => sum + item.total, 0);
        }
      } catch (error) {
        console.error('Error fetching visit charges:', error);
      }

      // Get clinic settings for additional fields
      const clinicSettings = (clinic.settings as Record<string, any>) || {};

      setSummaryData({
        clinicName: clinic.name,
        clinicLogo: clinic.logo_url || undefined,
        clinicPhone: clinic.phone || undefined,
        clinicAddress: clinic.address || undefined,
        clinicWebsite: clinicSettings.website || undefined,
        clinicVetLicense: clinicSettings.vetLicense || undefined,
        clinicEmail: clinic.email || undefined,
        primaryColor: clinicSettings.primaryColor || '#E8833A',
        vetSignature: clinicSettings.vetSignature || undefined,
        visitDate: format(new Date(visit.visit_date), 'dd/MM/yyyy', { locale: he }),
        visitType: visit.visit_type,
        petName: visit.pets?.name || 'לא ידוע',
        petSpecies: visit.pets?.species || 'other',
        petBreed: visit.pets?.breed || undefined,
        petSex: visit.pets?.sex || undefined,
        petNeuterStatus: visit.pets?.neuter_status || undefined,
        petWeight: visit.pets?.current_weight || undefined,
        petAge: calculateAge(visit.pets?.birth_date || null),
        ownerName,
        ownerPhone: visit.clients?.phone_primary || '',
        generalHistory: visit.general_history || undefined,
        medicalHistory: visit.medical_history || undefined,
        currentHistory: visit.current_history || undefined,
        physicalExam: visit.physical_exam || undefined,
        diagnoses,
        treatments,
        medications,
        recommendations: visit.recommendations || undefined,
        notesToOwner: visit.client_summary || undefined,
        charges,
        totalAmount,
        vaccinations,
      });
    };

    initializeSummaryData();
  }, [visit, clinic, getDiagnosisLabel, getTreatmentLabel, getMedicationLabel]);

  const handleDownloadPdf = async () => {
    if (!summaryData) return;

    setLoading(true);
    try {
      await downloadVisitPdfFromData(
        summaryData,
        `סיכום-ביקור-${summaryData.petName}-${summaryData.visitDate.replace(/[/:]/g, '-')}.pdf`
      );
      toast.success('ה-PDF הורד בהצלחה');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('שגיאה ביצירת PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!summaryData) return;

    if (!summaryData.ownerPhone) {
      toast.error('לא נמצא מספר טלפון ללקוח');
      return;
    }

    // Auto-save before sending if there are unsaved changes
    if (isDirty) {
      const saved = await saveChangesToVisit();
      if (!saved) {
        toast.error('לא ניתן לשלוח - שגיאה בשמירת השינויים');
        return;
      }
    }

    setSendingWhatsApp(true);
    try {
      const result = await openWhatsAppWithPdfFromData(
        summaryData,
        summaryData.ownerPhone,
        clinicId || undefined
      );

      if (result.sentViaGreenApi) {
        // Sent directly via Green API
        toast.success('הסיכום נשלח בהצלחה ב-WhatsApp!');
      } else if (result.pdfUrl) {
        // Fallback: opened wa.me with link
        toast.success('WhatsApp נפתח עם קישור לסיכום הביקור');
      } else {
        // Fallback: opened wa.me, PDF downloaded locally
        toast.success('WhatsApp נפתח. ה-PDF הורד למחשב - צרפי אותו להודעה.');
      }
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      toast.error('שגיאה בשליחת WhatsApp');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  if (!visit || !summaryData) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">סיכום ביקור - {summaryData.petName}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 mb-4" dir="rtl">
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              תצוגה מקדימה
            </TabsTrigger>
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              עריכה
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto">
            <TabsContent value="preview" className="mt-0 h-full">
              <div className="flex justify-center py-4 bg-gray-100 rounded-lg min-h-[400px]">
                <div ref={previewRef}>
                  <VisitSummaryPreview data={summaryData} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="edit" className="mt-0 h-full">
              <VisitSummaryEditor data={summaryData} onChange={handleSummaryDataChange} />
            </TabsContent>
          </div>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          {isDirty && (
            <Button
              onClick={saveChangesToVisit}
              disabled={isSaving}
              variant="outline"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 ml-2" />
              )}
              שמור שינויים
            </Button>
          )}
          <Button
            onClick={handleDownloadPdf}
            disabled={loading}
            variant="outline"
            className="flex-1"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 ml-2" />
            )}
            הורד PDF
          </Button>
          <Button
            onClick={handleSendWhatsApp}
            disabled={sendingWhatsApp || !summaryData.ownerPhone}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {sendingWhatsApp ? (
              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 ml-2" />
            )}
            שלח בווטסאפ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
