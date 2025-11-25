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

// Full settings response from Green API
export interface GreenApiSettings {
  webhookUrl?: string;
  webhookUrlToken?: string;
  incomingWebhook?: string;
  outgoingWebhook?: string;
  outgoingMessageWebhook?: string;
  outgoingAPIMessageWebhook?: string;
  stateWebhook?: string;
  deviceWebhook?: string;
}

// Get current webhook settings
export const getWebhookSettings = async (
  config: WhatsAppConfig
): Promise<GreenApiSettings & { error?: string }> => {
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
    console.log('Green API getSettings response:', data);

    if (response.ok) {
      return {
        webhookUrl: data.webhookUrl,
        webhookUrlToken: data.webhookUrlToken,
        incomingWebhook: data.incomingWebhook,
        outgoingWebhook: data.outgoingWebhook,
        outgoingMessageWebhook: data.outgoingMessageWebhook,
        outgoingAPIMessageWebhook: data.outgoingAPIMessageWebhook,
        stateWebhook: data.stateWebhook,
        deviceWebhook: data.deviceWebhook,
      };
    } else {
      return { error: data.message || 'שגיאה בקבלת הגדרות' };
    }
  } catch (error: any) {
    return { error: error.message || 'שגיאת רשת' };
  }
};

// Receive incoming notification (for polling)
export interface IncomingNotification {
  receiptId: number;
  body: {
    typeWebhook: string;
    instanceData: {
      idInstance: number;
      wid: string;
      typeInstance: string;
    };
    timestamp: number;
    idMessage: string;
    senderData: {
      chatId: string;
      sender: string;
      senderName: string;
    };
    messageData: {
      typeMessage: string;
      textMessageData?: {
        textMessage: string;
      };
      extendedTextMessageData?: {
        text: string;
      };
    };
  };
}

// Receive notification from Green API (polling method)
export const receiveNotification = async (
  config: WhatsAppConfig
): Promise<IncomingNotification | null> => {
  if (!config.isEnabled || !config.instanceId || !config.apiToken) {
    return null;
  }

  try {
    const response = await fetch(
      `${buildApiUrl(config.instanceId, 'receiveNotification')}/${config.apiToken}`,
      {
        method: 'GET',
      }
    );

    const data = await response.json();

    if (response.ok && data) {
      return data as IncomingNotification;
    }
    return null;
  } catch (error: any) {
    console.error('Error receiving notification:', error);
    return null;
  }
};

// Delete notification after processing
export const deleteNotification = async (
  config: WhatsAppConfig,
  receiptId: number
): Promise<boolean> => {
  if (!config.instanceId || !config.apiToken) {
    return false;
  }

  try {
    const response = await fetch(
      `${buildApiUrl(config.instanceId, 'deleteNotification')}/${config.apiToken}/${receiptId}`,
      {
        method: 'DELETE',
      }
    );

    const data = await response.json();
    return response.ok && data.result === true;
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    return false;
  }
};

// Extract phone from chatId (972XXXXXXXXX@c.us -> 972XXXXXXXXX)
export const extractPhoneFromChatId = (chatId: string): string => {
  return chatId.replace('@c.us', '').replace('@g.us', '');
};

// Get chat history from Green API
export interface GreenApiMessage {
  idMessage: string;
  timestamp: number;
  typeMessage: string;
  chatId: string;
  textMessage?: string;
  extendedTextMessage?: {
    text: string;
  };
  type: 'incoming' | 'outgoing';
  senderId?: string;
  senderName?: string;
}

export interface ChatHistoryMessage {
  idMessage: string;
  timestamp: number;
  type: 'incoming' | 'outgoing';
  chatId: string;
  textMessage?: string;
  extendedTextMessageData?: {
    text: string;
  };
  downloadUrl?: string;
  caption?: string;
  fileName?: string;
  typeMessage: string;
  senderId?: string;
  senderName?: string;
}

// Get all chats (conversations list)
export const getChats = async (
  config: WhatsAppConfig
): Promise<{ chatId: string; name: string; lastMessageTime: number }[]> => {
  if (!config.isEnabled || !config.instanceId || !config.apiToken) {
    return [];
  }

  try {
    const response = await fetch(
      `${buildApiUrl(config.instanceId, 'getChats')}/${config.apiToken}`,
      {
        method: 'GET',
      }
    );

    const data = await response.json();

    if (response.ok && Array.isArray(data)) {
      // Filter only personal chats (not groups)
      return data
        .filter((chat: any) => chat.id?.endsWith('@c.us'))
        .map((chat: any) => ({
          chatId: chat.id,
          name: chat.name || extractPhoneFromChatId(chat.id),
          lastMessageTime: chat.lastMessageTime || 0,
        }));
    }
    return [];
  } catch (error: any) {
    console.error('Error getting chats:', error);
    return [];
  }
};

// Get chat history (messages for a specific chat)
export const getChatHistory = async (
  config: WhatsAppConfig,
  chatId: string,
  count: number = 100
): Promise<ChatHistoryMessage[]> => {
  if (!config.isEnabled || !config.instanceId || !config.apiToken) {
    return [];
  }

  try {
    const response = await fetch(
      `${buildApiUrl(config.instanceId, 'getChatHistory')}/${config.apiToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          count,
        }),
      }
    );

    const data = await response.json();

    if (response.ok && Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (error: any) {
    console.error('Error getting chat history:', error);
    return [];
  }
};

// Get last incoming messages across all chats
export const getLastIncomingMessages = async (
  config: WhatsAppConfig,
  minutes: number = 1440 // Last 24 hours by default
): Promise<ChatHistoryMessage[]> => {
  if (!config.isEnabled || !config.instanceId || !config.apiToken) {
    return [];
  }

  try {
    const response = await fetch(
      `${buildApiUrl(config.instanceId, 'lastIncomingMessages')}/${config.apiToken}?minutes=${minutes}`,
      {
        method: 'GET',
      }
    );

    const data = await response.json();

    if (response.ok && Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (error: any) {
    console.error('Error getting last incoming messages:', error);
    return [];
  }
};

// Get last outgoing messages across all chats
export const getLastOutgoingMessages = async (
  config: WhatsAppConfig,
  minutes: number = 1440 // Last 24 hours by default
): Promise<ChatHistoryMessage[]> => {
  if (!config.isEnabled || !config.instanceId || !config.apiToken) {
    return [];
  }

  try {
    const response = await fetch(
      `${buildApiUrl(config.instanceId, 'lastOutgoingMessages')}/${config.apiToken}?minutes=${minutes}`,
      {
        method: 'GET',
      }
    );

    const data = await response.json();

    if (response.ok && Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (error: any) {
    console.error('Error getting last outgoing messages:', error);
    return [];
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
