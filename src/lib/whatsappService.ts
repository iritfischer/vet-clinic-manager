// Green API WhatsApp Service
// Documentation: https://green-api.com/en/docs/

export interface WhatsAppConfig {
  instanceId: string;
  apiToken: string;
  isEnabled: boolean;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Format phone number to WhatsApp format (972XXXXXXXXX)
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // Handle Israeli numbers
  if (cleaned.startsWith('0')) {
    cleaned = '972' + cleaned.substring(1);
  } else if (!cleaned.startsWith('972')) {
    cleaned = '972' + cleaned;
  }

  return cleaned;
};

// Build API URL for Green API
const buildApiUrl = (instanceId: string, method: string): string => {
  return `https://api.green-api.com/waInstance${instanceId}/${method}`;
};

// Send a text message via WhatsApp
export const sendWhatsAppMessage = async (
  config: WhatsAppConfig,
  phoneNumber: string,
  message: string
): Promise<SendMessageResult> => {
  if (!config.isEnabled || !config.instanceId || !config.apiToken) {
    return { success: false, error: 'WhatsApp לא מוגדר' };
  }

  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const chatId = `${formattedPhone}@c.us`;

    const response = await fetch(
      `${buildApiUrl(config.instanceId, 'sendMessage')}/${config.apiToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          message,
        }),
      }
    );

    const data = await response.json();

    if (response.ok && data.idMessage) {
      return { success: true, messageId: data.idMessage };
    } else {
      return { success: false, error: data.message || 'שגיאה בשליחת הודעה' };
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'שגיאת רשת' };
  }
};

// Check if instance is authorized (QR scanned)
export const checkWhatsAppStatus = async (
  config: WhatsAppConfig
): Promise<{ authorized: boolean; phone?: string; error?: string }> => {
  if (!config.instanceId || !config.apiToken) {
    return { authorized: false, error: 'פרטי החיבור חסרים' };
  }

  try {
    const response = await fetch(
      `${buildApiUrl(config.instanceId, 'getStateInstance')}/${config.apiToken}`,
      {
        method: 'GET',
      }
    );

    const data = await response.json();

    if (response.ok) {
      return {
        authorized: data.stateInstance === 'authorized',
        phone: data.phoneNumber,
      };
    } else {
      return { authorized: false, error: data.message || 'שגיאה בבדיקת סטטוס' };
    }
  } catch (error: any) {
    return { authorized: false, error: error.message || 'שגיאת רשת' };
  }
};

// Get QR code for authorization
export const getWhatsAppQR = async (
  config: WhatsAppConfig
): Promise<{ qrCode?: string; error?: string }> => {
  if (!config.instanceId || !config.apiToken) {
    return { error: 'פרטי החיבור חסרים' };
  }

  try {
    const response = await fetch(
      `${buildApiUrl(config.instanceId, 'qr')}/${config.apiToken}`,
      {
        method: 'GET',
      }
    );

    const data = await response.json();

    if (response.ok && data.message) {
      return { qrCode: data.message };
    } else {
      return { error: data.message || 'לא ניתן לקבל QR' };
    }
  } catch (error: any) {
    return { error: error.message || 'שגיאת רשת' };
  }
};

// Set webhook URL for receiving incoming messages
export const setWebhookUrl = async (
  config: WhatsAppConfig,
  webhookUrl: string
): Promise<{ success: boolean; error?: string }> => {
  if (!config.instanceId || !config.apiToken) {
    return { success: false, error: 'פרטי החיבור חסרים' };
  }

  try {
    const response = await fetch(
      `${buildApiUrl(config.instanceId, 'setSettings')}/${config.apiToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhookUrl: webhookUrl,
          webhookUrlToken: '',
          delaySendMessagesMilliseconds: 1000,
          markIncomingMessagesReaded: 'no',
          markIncomingMessagesReadedOnReply: 'no',
          outgoingWebhook: 'no',
          outgoingMessageWebhook: 'no',
          outgoingAPIMessageWebhook: 'no',
          incomingWebhook: 'yes',
          deviceWebhook: 'no',
          stateWebhook: 'no',
          keepOnlineStatus: 'no',
        }),
      }
    );

    const data = await response.json();

    if (response.ok && data.saveSettings) {
      return { success: true };
    } else {
      return { success: false, error: data.message || 'שגיאה בהגדרת webhook' };
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'שגיאת רשת' };
  }
};

// Get current webhook settings
export const getWebhookSettings = async (
  config: WhatsAppConfig
): Promise<{ webhookUrl?: string; incomingWebhook?: string; error?: string }> => {
  if (!config.instanceId || !config.apiToken) {
    return { error: 'פרטי החיבור חסרים' };
  }

  try {
    const response = await fetch(
      `${buildApiUrl(config.instanceId, 'getSettings')}/${config.apiToken}`,
      {
        method: 'GET',
      }
    );

    const data = await response.json();

    if (response.ok) {
      return {
        webhookUrl: data.webhookUrl,
        incomingWebhook: data.incomingWebhook,
      };
    } else {
      return { error: data.message || 'שגיאה בקבלת הגדרות' };
    }
  } catch (error: any) {
    return { error: error.message || 'שגיאת רשת' };
  }
};

// Template messages
export const messageTemplates = {
  appointmentReminder: (clinicName: string, petName: string, date: string, time: string) =>
    `שלום,\n\nתזכורת מ${clinicName}:\nלחיית המחמד ${petName} יש תור ב-${date} בשעה ${time}.\n\nנשמח לראותכם!`,

  visitSummary: (clinicName: string, petName: string, summary: string) =>
    `שלום,\n\nסיכום ביקור מ${clinicName}:\nחיית מחמד: ${petName}\n\n${summary}\n\nלשאלות ניתן לפנות לקליניקה.`,

  vaccinationReminder: (clinicName: string, petName: string, vaccinationType: string, dueDate: string) =>
    `שלום,\n\nתזכורת חיסון מ${clinicName}:\nלחיית המחמד ${petName} מתקרב מועד חיסון ${vaccinationType} בתאריך ${dueDate}.\n\nאנא צרו קשר לקביעת תור.`,

  generalReminder: (clinicName: string, petName: string, reminderText: string) =>
    `שלום,\n\nתזכורת מ${clinicName}:\nלגבי ${petName}: ${reminderText}\n\nלשאלות ניתן לפנות לקליניקה.`,
};
