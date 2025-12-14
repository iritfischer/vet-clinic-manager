import { pdf } from '@react-pdf/renderer';
import { supabase } from '@/integrations/supabase/client';
import { VisitSummaryData } from './visitSummaryTypes';
import { sendWhatsAppMessage, WhatsAppConfig } from './whatsappService';
import { VisitSummaryPdf } from '@/components/visits/VisitSummaryPdf';

export const generateVisitPdfFromData = async (data: VisitSummaryData): Promise<Blob> => {
  const doc = <VisitSummaryPdf data={data} />;
  const blob = await pdf(doc).toBlob();
  return blob;
};

export const downloadVisitPdfFromData = async (
  data: VisitSummaryData,
  filename?: string
) => {
  const blob = await generateVisitPdfFromData(data);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'visit-summary.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Upload PDF to Supabase Storage and get public URL
export const uploadPdfToStorage = async (
  blob: Blob,
  filename: string,
  clinicId: string
): Promise<string> => {
  const filePath = `visit-summaries/${clinicId}/${filename}`;

  // Upload to Supabase Storage
  const { error } = await supabase.storage
    .from('sum')
    .upload(filePath, blob, {
      contentType: 'application/pdf',
      upsert: true, // Overwrite if exists
    });

  if (error) {
    throw new Error(`Failed to upload PDF: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('sum')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
};

// Helper to create safe filename for storage
const createSafeFilename = (petName: string, visitDate: string): string => {
  // Remove Hebrew and special characters, keep only alphanumeric and dashes
  const safePetName = petName.replace(/[^a-zA-Z0-9]/g, '') || 'pet';
  const safeDate = visitDate.replace(/[/:.\s]/g, '-');
  return `visit-summary-${safePetName}-${safeDate}-${Date.now()}.pdf`;
};

// Get WhatsApp config from clinic settings
const getWhatsAppConfig = async (clinicId: string): Promise<WhatsAppConfig | null> => {
  try {
    const { data: clinic } = await supabase
      .from('clinics')
      .select('settings')
      .eq('id', clinicId)
      .single();

    if (clinic?.settings) {
      const settings = clinic.settings as Record<string, any>;
      const whatsapp = settings?.whatsapp;
      if (whatsapp?.instanceId && whatsapp?.apiToken && whatsapp?.isEnabled) {
        return {
          instanceId: whatsapp.instanceId,
          apiToken: whatsapp.apiToken,
          isEnabled: whatsapp.isEnabled,
        };
      }
    }
  } catch (error) {
    console.error('Error getting WhatsApp config:', error);
  }
  return null;
};

export const openWhatsAppWithPdfFromData = async (
  data: VisitSummaryData,
  phoneNumber: string,
  clinicId?: string
): Promise<{ success: boolean; pdfUrl?: string; sentViaGreenApi?: boolean }> => {
  // Generate PDF blob
  const blob = await generateVisitPdfFromData(data);
  // Use safe filename for storage (no Hebrew characters)
  const storageFilename = createSafeFilename(data.petName, data.visitDate);
  // Use Hebrew filename for local download
  const downloadFilename = `סיכום-ביקור-${data.petName}-${data.visitDate.replace(/[/:]/g, '-')}.pdf`;

  let pdfUrl: string | undefined;

  // Try to upload to storage if clinicId is provided
  if (clinicId) {
    try {
      pdfUrl = await uploadPdfToStorage(blob, storageFilename, clinicId);
    } catch (error) {
      console.warn('Could not upload to storage, will download locally:', error);
    }
  }

  // If no URL, download locally with Hebrew filename
  if (!pdfUrl) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Prepare WhatsApp message text
  let messageText: string;
  if (pdfUrl) {
    messageText =
      `שלום!\n\n` +
      `מצורף סיכום הביקור של ${data.petName} מתאריך ${data.visitDate}:\n` +
      `${pdfUrl}\n\n` +
      `בברכה,\n${data.clinicName}`;
  } else {
    messageText =
      `שלום!\n\n` +
      `מצורף סיכום הביקור של ${data.petName} מתאריך ${data.visitDate}.\n\n` +
      `בברכה,\n${data.clinicName}`;
  }

  // Try to send via Green API if configured
  if (clinicId) {
    const whatsappConfig = await getWhatsAppConfig(clinicId);

    if (whatsappConfig) {
      const result = await sendWhatsAppMessage(whatsappConfig, phoneNumber, messageText);

      if (result.success) {
        // Log the message to database
        try {
          await supabase.from('whatsapp_messages').insert({
            clinic_id: clinicId,
            content: messageText,
            direction: 'outgoing',
            provider_message_id: result.messageId || null,
            sent_at: new Date().toISOString(),
          });
        } catch (error) {
          console.error('Failed to log WhatsApp message:', error);
        }

        return { success: true, pdfUrl, sentViaGreenApi: true };
      } else {
        console.warn('Green API failed, falling back to wa.me:', result.error);
      }
    }
  }

  // Fallback: Open WhatsApp in browser
  const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
  const internationalPhone = cleanPhone.startsWith('0')
    ? '972' + cleanPhone.slice(1)
    : cleanPhone;

  const message = encodeURIComponent(messageText);
  window.open(`https://wa.me/${internationalPhone}?text=${message}`, '_blank');

  return { success: true, pdfUrl, sentViaGreenApi: false };
};

// Legacy exports for backwards compatibility
export const generateVisitPdf = generateVisitPdfFromData;
export const downloadVisitPdf = downloadVisitPdfFromData;
export const openWhatsAppWithPdf = openWhatsAppWithPdfFromData;
