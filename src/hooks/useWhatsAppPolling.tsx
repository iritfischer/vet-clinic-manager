import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import {
  receiveNotification,
  deleteNotification,
  extractPhoneFromChatId,
  IncomingNotification,
} from '@/lib/whatsappService';

const POLLING_INTERVAL = 5000; // 5 seconds

export const useWhatsAppPolling = (onNewMessage?: () => void) => {
  const { clinicId } = useClinic();
  const { config, isConfigured, isAuthorized } = useWhatsApp();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);

  // Process a single notification
  const processNotification = useCallback(async (notification: IncomingNotification) => {
    if (!clinicId) return false;

    const { body } = notification;

    // Only process incoming messages
    if (body.typeWebhook !== 'incomingMessageReceived') {
      return true; // Delete but don't save
    }

    // Extract message content
    let content = '';
    if (body.messageData.textMessageData) {
      content = body.messageData.textMessageData.textMessage;
    } else if (body.messageData.extendedTextMessageData) {
      content = body.messageData.extendedTextMessageData.text;
    }

    if (!content) {
      return true; // No text content, delete notification
    }

    // Extract sender info
    const senderPhone = extractPhoneFromChatId(body.senderData.chatId);
    const senderName = body.senderData.senderName || senderPhone;

    // Check if message already exists
    const { data: existing } = await supabase
      .from('whatsapp_messages')
      .select('id')
      .eq('message_id', body.idMessage)
      .single();

    if (existing) {
      return true; // Already processed
    }

    // Find if sender is a client
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('clinic_id', clinicId)
      .or(`phone_primary.ilike.%${senderPhone.slice(-9)}%,phone_secondary.ilike.%${senderPhone.slice(-9)}%`)
      .single();

    // Find if sender is a lead
    const { data: lead } = await supabase
      .from('leads')
      .select('id')
      .eq('clinic_id', clinicId)
      .ilike('phone', `%${senderPhone.slice(-9)}%`)
      .single();

    // Save message to database
    const { error } = await supabase.from('whatsapp_messages').insert({
      clinic_id: clinicId,
      client_id: client?.id || null,
      lead_id: lead?.id || null,
      message_id: body.idMessage,
      direction: 'incoming',
      content: content,
      sender_phone: senderPhone,
      sender_name: senderName,
      status: 'received',
      sent_at: new Date(body.timestamp * 1000).toISOString(),
    });

    if (error) {
      console.error('Error saving message:', error);
      return false;
    }

    return true;
  }, [clinicId]);

  // Poll for notifications
  const pollNotifications = useCallback(async () => {
    if (isProcessingRef.current || !config || !isConfigured || !isAuthorized) {
      return;
    }

    isProcessingRef.current = true;

    try {
      // Keep processing until queue is empty
      let hasMore = true;
      let processedCount = 0;
      const maxIterations = 20; // Safety limit

      while (hasMore && processedCount < maxIterations) {
        const notification = await receiveNotification(config);

        if (!notification) {
          hasMore = false;
          break;
        }

        // Process the notification
        const processed = await processNotification(notification);

        // Delete from queue (whether processed successfully or not)
        await deleteNotification(config, notification.receiptId);

        processedCount++;

        if (processed && onNewMessage) {
          onNewMessage();
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    } finally {
      isProcessingRef.current = false;
    }
  }, [config, isConfigured, isAuthorized, processNotification, onNewMessage]);

  // Start polling
  useEffect(() => {
    if (!isConfigured || !isAuthorized) {
      return;
    }

    // Initial poll
    pollNotifications();

    // Set up interval
    pollingRef.current = setInterval(pollNotifications, POLLING_INTERVAL);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isConfigured, isAuthorized, pollNotifications]);

  return {
    pollNow: pollNotifications,
  };
};
