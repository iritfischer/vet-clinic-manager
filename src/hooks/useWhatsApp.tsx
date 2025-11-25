import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';
import { useToast } from '@/hooks/use-toast';
import {
  WhatsAppConfig,
  sendWhatsAppMessage,
  checkWhatsAppStatus,
  SendMessageResult,
} from '@/lib/whatsappService';

export interface WhatsAppSettings extends WhatsAppConfig {
  lastChecked?: string;
  isAuthorized?: boolean;
  connectedPhone?: string;
}

export const useWhatsApp = () => {
  const { clinicId, clinic, refetchClinic } = useClinic();
  const { toast } = useToast();
  const [settings, setSettings] = useState<WhatsAppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  // Load settings from clinic
  useEffect(() => {
    if (clinic?.settings) {
      const clinicSettings = clinic.settings as Record<string, any>;
      const whatsappSettings = clinicSettings?.whatsapp || null;
      setSettings(whatsappSettings);
    } else {
      setSettings(null);
    }
    setLoading(false);
  }, [clinic]);

  // Save settings to clinic
  const saveSettings = useCallback(async (newSettings: Partial<WhatsAppSettings>) => {
    if (!clinicId) return false;

    try {
      const currentSettings = (clinic?.settings as Record<string, any>) || {};
      const updatedSettings = {
        ...currentSettings,
        whatsapp: {
          ...(currentSettings.whatsapp || {}),
          ...newSettings,
        },
      };

      const { error } = await supabase
        .from('clinics')
        .update({ settings: updatedSettings })
        .eq('id', clinicId);

      if (error) throw error;

      setSettings(prev => ({ ...prev, ...newSettings } as WhatsAppSettings));
      await refetchClinic?.();

      toast({
        title: 'הצלחה',
        description: 'הגדרות WhatsApp נשמרו',
      });

      return true;
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [clinicId, clinic, toast, refetchClinic]);

  // Check connection status
  const checkStatus = useCallback(async () => {
    if (!settings?.instanceId || !settings?.apiToken) return;

    setChecking(true);
    try {
      const result = await checkWhatsAppStatus({
        instanceId: settings.instanceId,
        apiToken: settings.apiToken,
        isEnabled: true,
      });

      await saveSettings({
        isAuthorized: result.authorized,
        connectedPhone: result.phone,
        lastChecked: new Date().toISOString(),
      });

      if (result.authorized) {
        toast({
          title: 'מחובר',
          description: `WhatsApp מחובר למספר ${result.phone || ''}`,
        });
      } else {
        toast({
          title: 'לא מחובר',
          description: result.error || 'נא לסרוק QR בלוח הבקרה של Green API',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setChecking(false);
    }
  }, [settings, saveSettings, toast]);

  // Send message
  const sendMessage = useCallback(async (
    phoneNumber: string,
    message: string,
    metadata?: {
      clientId?: string;
      appointmentId?: string;
      reminderId?: string;
    }
  ): Promise<SendMessageResult> => {
    if (!settings?.isEnabled || !settings?.instanceId || !settings?.apiToken) {
      return { success: false, error: 'WhatsApp לא מוגדר או לא מופעל' };
    }

    const result = await sendWhatsAppMessage(
      {
        instanceId: settings.instanceId,
        apiToken: settings.apiToken,
        isEnabled: settings.isEnabled,
      },
      phoneNumber,
      message
    );

    // Log message to database
    if (clinicId) {
      const { error } = await supabase.from('whatsapp_messages').insert({
        clinic_id: clinicId,
        client_id: metadata?.clientId || null,
        appointment_id: metadata?.appointmentId || null,
        reminder_id: metadata?.reminderId || null,
        content: message,
        direction: 'outbound',
        provider_message_id: result.messageId || null,
        sent_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Failed to log WhatsApp message:', error);
      }
    }

    if (result.success) {
      toast({
        title: 'הצלחה',
        description: 'ההודעה נשלחה בהצלחה',
      });
    } else {
      toast({
        title: 'שגיאה',
        description: result.error || 'שגיאה בשליחת הודעה',
        variant: 'destructive',
      });
    }

    return result;
  }, [settings, clinicId, toast]);

  // Build config object for API calls
  const config: WhatsAppConfig | null = settings?.instanceId && settings?.apiToken
    ? {
        instanceId: settings.instanceId,
        apiToken: settings.apiToken,
        isEnabled: settings.isEnabled ?? true,
      }
    : null;

  return {
    settings,
    config,
    loading,
    checking,
    isConfigured: !!(settings?.instanceId && settings?.apiToken),
    isEnabled: settings?.isEnabled ?? false,
    isAuthorized: settings?.isAuthorized ?? false,
    saveSettings,
    checkStatus,
    sendMessage,
  };
};
