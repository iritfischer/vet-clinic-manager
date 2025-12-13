import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { VisitSummaryData } from './visitSummaryTypes';
import { sendWhatsAppMessage, WhatsAppConfig } from './whatsappService';

export const generateVisitPdfFromElement = async (element: HTMLElement): Promise<Blob> => {
  // If element is a wrapper, try to find the actual content element
  let targetElement = element;
  const firstChild = element.firstElementChild as HTMLElement;
  if (firstChild && firstChild.scrollHeight > element.scrollHeight) {
    targetElement = firstChild;
  }

  // Find header, content, and footer elements
  const headerElement = targetElement.querySelector('[data-pdf-header="true"]') as HTMLElement;
  const contentElement = targetElement.querySelector('[data-pdf-content="true"]') as HTMLElement;
  const footerElement = targetElement.querySelector('[data-pdf-footer="true"]') as HTMLElement;

  // Ensure elements are visible and properly sized
  const originalOverflow = targetElement.style.overflow;
  const originalHeight = targetElement.style.height;
  const originalParentOverflow = targetElement.parentElement?.style.overflow || '';
  
  targetElement.style.overflow = 'visible';
  targetElement.style.height = 'auto';
  if (targetElement.parentElement) {
    targetElement.parentElement.style.overflow = 'visible';
  }

  // Wait a bit for layout to stabilize
  await new Promise(resolve => setTimeout(resolve, 200));

  // Helper function to create canvas from element
  const createElementCanvas = async (elem: HTMLElement) => {
    const width = elem.scrollWidth || elem.offsetWidth || 794;
    const height = elem.scrollHeight || elem.offsetHeight;
    
    return await html2canvas(elem, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      width,
      height,
      allowTaint: false,
      onclone: (clonedDoc, clonedElem) => {
        clonedElem.style.overflow = 'visible';
        clonedElem.style.height = 'auto';
        clonedElem.style.maxHeight = 'none';
        let parent = clonedElem.parentElement;
        while (parent && parent !== clonedDoc.body) {
          parent.style.overflow = 'visible';
          parent.style.height = 'auto';
          parent.style.maxHeight = 'none';
          parent = parent.parentElement;
        }
      },
    });
  };

  // Create canvases for header, content, and footer
  const headerCanvas = headerElement ? await createElementCanvas(headerElement) : null;
  const contentCanvas = contentElement ? await createElementCanvas(contentElement) : null;
  const footerCanvas = footerElement ? await createElementCanvas(footerElement) : null;

  // Restore original styles
  targetElement.style.overflow = originalOverflow;
  targetElement.style.height = originalHeight;
  if (targetElement.parentElement) {
    targetElement.parentElement.style.overflow = originalParentOverflow;
  }

  // A4 page dimensions in mm
  const imgWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm

  // Create PDF
  const pdf = new jsPDF('p', 'mm', 'a4');

  if (!contentCanvas) {
    // Fallback: if no content element found, use the whole element
    const fullCanvas = await createElementCanvas(targetElement);
    const pixelsPerMm = fullCanvas.width / imgWidth;
    const fullImgHeightMm = fullCanvas.height / pixelsPerMm;
    const totalPages = Math.ceil(fullImgHeightMm / pageHeight);
    const pageHeightInPixels = pageHeight * pixelsPerMm;

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();
      const sourceY = Math.floor(page * pageHeightInPixels);
      const sourceHeight = Math.min(Math.ceil(pageHeightInPixels), fullCanvas.height - sourceY);
      
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = fullCanvas.width;
      pageCanvas.height = sourceHeight;
      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(fullCanvas, 0, sourceY, fullCanvas.width, sourceHeight, 0, 0, fullCanvas.width, sourceHeight);
      }
      const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
      const pageImgHeightMm = sourceHeight / pixelsPerMm;
      pdf.addImage(pageImgData, 'PNG', 0, 0, imgWidth, pageImgHeightMm);
    }
    return pdf.output('blob');
  }

  // Calculate dimensions
  const pixelsPerMm = contentCanvas.width / imgWidth;
  
  // Calculate header and footer heights in mm
  const headerHeightMm = headerCanvas ? headerCanvas.height / pixelsPerMm : 0;
  const footerHeightMm = footerCanvas ? footerCanvas.height / pixelsPerMm : 0;
  
  // Available height for content per page (page height minus header and footer)
  const availableContentHeightMm = pageHeight - headerHeightMm - footerHeightMm;
  
  // Calculate content height in mm
  const contentHeightMm = contentCanvas.height / pixelsPerMm;
  
  // Calculate how many pages we need for content
  const totalPages = Math.max(1, Math.ceil(contentHeightMm / availableContentHeightMm));

  // Height of content per page in pixels
  const contentPageHeightInPixels = (availableContentHeightMm * pixelsPerMm);

  // Convert header and footer to images
  const headerImgData = headerCanvas ? headerCanvas.toDataURL('image/png', 1.0) : null;
  const footerImgData = footerCanvas ? footerCanvas.toDataURL('image/png', 1.0) : null;

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      pdf.addPage();
    }

    let currentY = 0;

    // Add header to every page
    if (headerImgData && headerCanvas) {
      const headerHeightMmActual = headerCanvas.height / pixelsPerMm;
      pdf.addImage(headerImgData, 'PNG', 0, currentY, imgWidth, headerHeightMmActual);
      currentY += headerHeightMmActual;
    }

    // Calculate content slice for this page
    const contentSourceY = Math.floor(page * contentPageHeightInPixels);
    const remainingContentHeight = contentCanvas.height - contentSourceY;
    const contentSourceHeight = Math.min(Math.ceil(contentPageHeightInPixels), remainingContentHeight);

    if (contentSourceHeight > 0 && contentSourceY < contentCanvas.height) {
      // Create a canvas for this content slice
      const contentPageCanvas = document.createElement('canvas');
      contentPageCanvas.width = contentCanvas.width;
      contentPageCanvas.height = contentSourceHeight;

      const ctx = contentPageCanvas.getContext('2d', { willReadFrequently: false });
      if (ctx) {
        // Fill with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, contentPageCanvas.width, contentPageCanvas.height);

        // Draw the content slice
        ctx.drawImage(
          contentCanvas,
          0, contentSourceY, contentCanvas.width, contentSourceHeight,  // Source
          0, 0, contentCanvas.width, contentSourceHeight                // Destination
        );
      }

      // Convert to image
      const contentPageImgData = contentPageCanvas.toDataURL('image/png', 1.0);
      const contentPageImgHeightMm = contentSourceHeight / pixelsPerMm;
      
      // Add content to PDF
      pdf.addImage(contentPageImgData, 'PNG', 0, currentY, imgWidth, contentPageImgHeightMm);
      currentY += contentPageImgHeightMm;
    }

    // Add footer to every page
    if (footerImgData && footerCanvas) {
      const footerHeightMmActual = footerCanvas.height / pixelsPerMm;
      pdf.addImage(footerImgData, 'PNG', 0, pageHeight - footerHeightMmActual, imgWidth, footerHeightMmActual);
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

export const openWhatsAppWithPdfFromElement = async (
  element: HTMLElement,
  phoneNumber: string,
  data: VisitSummaryData,
  clinicId?: string
): Promise<{ success: boolean; pdfUrl?: string; sentViaGreenApi?: boolean }> => {
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

// Legacy exports for backwards compatibility (if needed)
export const generateVisitPdf = generateVisitPdfFromElement;
export const downloadVisitPdf = downloadVisitPdfFromElement;
export const openWhatsAppWithPdf = openWhatsAppWithPdfFromElement;
