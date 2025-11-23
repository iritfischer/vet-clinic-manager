import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { VisitSummaryData } from './visitSummaryTypes';

export const generateVisitPdfFromElement = async (element: HTMLElement): Promise<Blob> => {
  // Create canvas from the HTML element
  const canvas = await html2canvas(element, {
    scale: 2, // Higher quality
    useCORS: true, // Allow cross-origin images
    backgroundColor: '#ffffff',
    logging: false,
  });

  // Calculate dimensions for A4 page
  const imgWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Create PDF
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgData = canvas.toDataURL('image/png');

  // Add image to PDF
  if (imgHeight <= pageHeight) {
    // Single page
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
  } else {
    // Multiple pages
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
  }

  // Return as blob
  return pdf.output('blob');
};

export const downloadVisitPdfFromElement = async (
  element: HTMLElement,
  filename?: string
) => {
  const blob = await generateVisitPdfFromElement(element);
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
  const { data, error } = await supabase.storage
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

export const openWhatsAppWithPdfFromElement = async (
  element: HTMLElement,
  phoneNumber: string,
  data: VisitSummaryData,
  clinicId?: string
): Promise<{ success: boolean; pdfUrl?: string }> => {
  // Generate PDF blob
  const blob = await generateVisitPdfFromElement(element);
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
    await downloadVisitPdfFromElement(element, downloadFilename);
  }

  // Clean phone number (remove spaces, dashes, etc.)
  const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
  const internationalPhone = cleanPhone.startsWith('0')
    ? '972' + cleanPhone.slice(1)
    : cleanPhone;

  // Prepare WhatsApp message text
  let messageText: string;
  if (pdfUrl) {
    messageText =
      `שלום! 🐾\n\n` +
      `מצורף סיכום הביקור של *${data.petName}* מתאריך ${data.visitDate}:\n` +
      `${pdfUrl}\n\n` +
      `בברכה,\n${data.clinicName}`;
  } else {
    messageText =
      `שלום! 🐾\n\n` +
      `מצורף סיכום הביקור של *${data.petName}* מתאריך ${data.visitDate}.\n\n` +
      `בברכה,\n${data.clinicName}`;
  }

  const message = encodeURIComponent(messageText);

  // Open WhatsApp with the message
  window.open(`https://wa.me/${internationalPhone}?text=${message}`, '_blank');

  return { success: true, pdfUrl };
};

// Legacy exports for backwards compatibility (if needed)
export const generateVisitPdf = generateVisitPdfFromElement;
export const downloadVisitPdf = downloadVisitPdfFromElement;
export const openWhatsAppWithPdf = openWhatsAppWithPdfFromElement;
