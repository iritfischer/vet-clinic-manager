import { useState, useEffect, useRef } from 'react';
import { Tables } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Send, Eye, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInYears, differenceInMonths } from 'date-fns';
import { he } from 'date-fns/locale';

import { VisitSummaryPreview } from './VisitSummaryPreview';
import { VisitSummaryEditor } from './VisitSummaryEditor';
import { VisitSummaryData, VisitWithRelations, DiagnosisItem, TreatmentItem, MedicationItem, ChargeItem } from '@/lib/visitSummaryTypes';
import { downloadVisitPdfFromElement, openWhatsAppWithPdfFromElement } from '@/lib/generateVisitPdf';

interface VisitSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit: VisitWithRelations | null;
}

export const VisitSummaryDialog = ({ open, onOpenChange, visit }: VisitSummaryDialogProps) => {
  const { clinicId } = useClinic();
  const [clinic, setClinic] = useState<Tables<'clinics'> | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('preview');
  const [summaryData, setSummaryData] = useState<VisitSummaryData | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

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
            diagnosis: d.diagnosis || '',
            notes: d.notes || '',
          }))
        : [];

      const treatments: TreatmentItem[] = Array.isArray(visit.treatments)
        ? (visit.treatments as any[]).map((t) => ({
            treatment: t.treatment || '',
            notes: t.notes || '',
          }))
        : [];

      const medications: MedicationItem[] = Array.isArray(visit.medications)
        ? (visit.medications as any[]).map((m) => ({
            medication: m.medication || '',
            dosage: m.dosage || '',
            frequency: m.frequency || '',
            duration: m.duration || '',
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

      setSummaryData({
        clinicName: clinic.name,
        clinicLogo: clinic.logo_url || undefined,
        clinicPhone: clinic.phone || undefined,
        clinicAddress: clinic.address || undefined,
        visitDate: format(new Date(visit.visit_date), 'dd/MM/yyyy HH:mm', { locale: he }),
        visitType: visit.visit_type,
        petName: visit.pets?.name || 'לא ידוע',
        petSpecies: visit.pets?.species || 'other',
        petBreed: visit.pets?.breed || undefined,
        petSex: visit.pets?.sex || undefined,
        petWeight: visit.pets?.current_weight || undefined,
        petAge: calculateAge(visit.pets?.birth_date || null),
        ownerName,
        ownerPhone: visit.clients?.phone_primary || '',
        diagnoses,
        treatments,
        medications,
        recommendations: visit.recommendations || undefined,
        notesToOwner: visit.client_summary || undefined,
        charges,
        totalAmount,
      });
    };

    initializeSummaryData();
  }, [visit, clinic]);

  const handleDownloadPdf = async () => {
    if (!summaryData || !previewRef.current) return;

    // Make sure we're on the preview tab to capture the element
    setActiveTab('preview');

    // Wait a bit for the tab to render
    await new Promise(resolve => setTimeout(resolve, 100));

    setLoading(true);
    try {
      const element = previewRef.current;
      if (!element) {
        throw new Error('Preview element not found');
      }
      await downloadVisitPdfFromElement(
        element,
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
    if (!summaryData || !previewRef.current) return;

    if (!summaryData.ownerPhone) {
      toast.error('לא נמצא מספר טלפון ללקוח');
      return;
    }

    // Make sure we're on the preview tab to capture the element
    setActiveTab('preview');

    // Wait a bit for the tab to render
    await new Promise(resolve => setTimeout(resolve, 100));

    setSendingWhatsApp(true);
    try {
      const element = previewRef.current;
      if (!element) {
        throw new Error('Preview element not found');
      }
      const result = await openWhatsAppWithPdfFromElement(
        element,
        summaryData.ownerPhone,
        summaryData,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">סיכום ביקור - {summaryData.petName}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 mb-4">
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
              <VisitSummaryEditor data={summaryData} onChange={setSummaryData} />
            </TabsContent>
          </div>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
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
