import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import {
  getLastIncomingMessages,
  getLastOutgoingMessages,
  extractPhoneFromChatId,
  ChatHistoryMessage,
} from '@/lib/whatsappService';
import { Conversation, ConversationFilter, Client, Lead } from '@/types/leads';

// Normalize phone number for comparison
const normalizePhone = (phone: string): string => {
  if (!phone) return '';
  let normalized = phone.replace(/\D/g, '');
  if (normalized.startsWith('972')) {
    normalized = '0' + normalized.slice(3);
  }
  if (normalized.length === 9 && !normalized.startsWith('0')) {
    normalized = '0' + normalized;
  }
  return normalized;
};

export const useGreenApiConversations = () => {
  const { clinicId } = useClinic();
  const { config, isConfigured, isAuthorized } = useWhatsApp();

  const [allMessages, setAllMessages] = useState<ChatHistoryMessage[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch clients from Supabase
  const fetchClients = useCallback(async () => {
    if (!clinicId) return;
    try {
      const { data } = await supabase
        .from('clients')
        .select('id, first_name, last_name, phone_primary, phone_secondary, email')
        .eq('clinic_id', clinicId)
        .eq('status', 'active');
      setClients((data || []) as Client[]);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  }, [clinicId]);

  // Fetch leads from Supabase
  const fetchLeads = useCallback(async () => {
    if (!clinicId) return;
    try {
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('clinic_id', clinicId)
        .neq('status', 'converted');
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  }, [clinicId]);

  // Fetch recent messages from Green API (much lighter than getChats + getChatHistory)
  const fetchMessages = useCallback(async () => {
    if (!config || !isConfigured || !isAuthorized) {
      return;
    }

    try {
      // Fetch last 24 hours of messages (2 API calls instead of 50+)
      const [incoming, outgoing] = await Promise.all([
        getLastIncomingMessages(config, 1440), // 24 hours
        getLastOutgoingMessages(config, 1440),
      ]);

      // Combine and deduplicate by message ID
      const messageMap = new Map<string, ChatHistoryMessage>();

      incoming.forEach(msg => {
        messageMap.set(msg.idMessage, { ...msg, type: 'incoming' });
      });

      outgoing.forEach(msg => {
        messageMap.set(msg.idMessage, { ...msg, type: 'outgoing' });
      });

      setAllMessages(Array.from(messageMap.values()));
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [config, isConfigured, isAuthorized]);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchClients(), fetchLeads(), fetchMessages()]);
      setLoading(false);
    };
    loadData();
  }, [fetchClients, fetchLeads, fetchMessages]);

  // Auto-refresh disabled for now - use manual refresh button
  // useEffect(() => {
  //   if (!isConfigured || !isAuthorized) return;
  //   const interval = setInterval(() => {
  //     fetchMessages();
  //   }, 15000);
  //   return () => clearInterval(interval);
  // }, [isConfigured, isAuthorized, fetchMessages]);

  // Build conversations from messages
  const conversations = useMemo((): Conversation[] => {
    // Create phone -> client/lead lookups
    const phoneToClient = new Map<string, Client>();
    clients.forEach(client => {
      const normalized = normalizePhone(client.phone_primary);
      if (normalized) phoneToClient.set(normalized, client);
    });

    const phoneToLead = new Map<string, Lead>();
    leads.forEach(lead => {
      const normalized = normalizePhone(lead.phone);
      if (normalized) phoneToLead.set(normalized, lead);
    });

    // Group messages by phone number (chatId)
    const conversationMap = new Map<string, {
      phone: string;
      chatId: string;
      messages: ChatHistoryMessage[];
      name?: string;
    }>();

    allMessages.forEach(msg => {
      if (!msg.chatId || msg.chatId.endsWith('@g.us')) return; // Skip groups

      const phone = extractPhoneFromChatId(msg.chatId);
      const normalizedPhone = normalizePhone(phone);

      if (!conversationMap.has(normalizedPhone)) {
        conversationMap.set(normalizedPhone, {
          phone,
          chatId: msg.chatId,
          messages: [],
          name: msg.senderName,
        });
      }

      conversationMap.get(normalizedPhone)!.messages.push(msg);
    });

    // Build conversation objects
    const result = Array.from(conversationMap.values()).map(conv => {
      const normalizedPhone = normalizePhone(conv.phone);

      // Find client or lead
      const client = phoneToClient.get(normalizedPhone);
      const lead = phoneToLead.get(normalizedPhone);

      let type: 'client' | 'lead' | 'unknown' = 'unknown';
      let name = conv.name || conv.phone;

      if (client) {
        type = 'client';
        name = `${client.first_name} ${client.last_name}`.trim();
      } else if (lead) {
        type = 'lead';
        name = lead.last_name
          ? `${lead.first_name} ${lead.last_name}`.trim()
          : lead.first_name;
      }

      // Sort messages by time
      const sortedMessages = [...conv.messages].sort((a, b) => a.timestamp - b.timestamp);
      const lastMsg = sortedMessages[sortedMessages.length - 1];
      const lastMessageContent = lastMsg?.textMessage ||
        lastMsg?.extendedTextMessageData?.text ||
        lastMsg?.caption || '';

      // Convert messages to our format
      const convertedMessages = sortedMessages.map(msg => ({
        id: msg.idMessage,
        clinic_id: clinicId || '',
        client_id: client?.id || null,
        lead_id: lead?.id || null,
        provider_message_id: msg.idMessage,
        appointment_id: null,
        reminder_id: null,
        direction: msg.type === 'incoming' ? 'incoming' : 'outgoing',
        content: msg.textMessage || msg.extendedTextMessageData?.text || msg.caption || '',
        sender_phone: msg.type === 'incoming' ? conv.phone : null,
        sent_at: new Date(msg.timestamp * 1000).toISOString(),
        created_at: new Date(msg.timestamp * 1000).toISOString(),
      }));

      return {
        id: normalizedPhone,
        phone: conv.phone,
        type,
        name,
        clientId: client?.id,
        leadId: lead?.id,
        client: client || undefined,
        lead: lead || undefined,
        lastMessage: lastMessageContent,
        lastMessageTime: lastMsg ? new Date(lastMsg.timestamp * 1000).toISOString() : '',
        unreadCount: 0,
        messages: convertedMessages,
      };
    });

    // Sort by last message time
    result.sort((a, b) => {
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return timeB - timeA;
    });

    return result;
  }, [allMessages, clients, leads, clinicId]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    let result = conversations;

    if (filter !== 'all') {
      const typeMap: Record<string, string> = {
        clients: 'client',
        leads: 'lead',
        unknown: 'unknown',
      };
      const targetType = typeMap[filter] || filter;
      result = result.filter(conv => conv.type === targetType);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(conv =>
        conv.name.toLowerCase().includes(query) ||
        conv.phone.includes(query) ||
        normalizePhone(conv.phone).includes(query.replace(/\D/g, ''))
      );
    }

    return result;
  }, [conversations, filter, searchQuery]);

  // Get conversation by phone
  const getConversationByPhone = useCallback((phone: string): Conversation | undefined => {
    const normalized = normalizePhone(phone);
    return conversations.find(conv => conv.id === normalized);
  }, [conversations]);

  // Refresh function
  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchClients(), fetchLeads(), fetchMessages()]);
    setLoading(false);
  }, [fetchClients, fetchLeads, fetchMessages]);

  return {
    conversations: filteredConversations,
    allConversations: conversations,
    loading,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    getConversationByPhone,
    refresh,
    stats: {
      total: conversations.length,
      clients: conversations.filter(c => c.type === 'client').length,
      leads: conversations.filter(c => c.type === 'lead').length,
      unknown: conversations.filter(c => c.type === 'unknown').length,
    },
  };
};
