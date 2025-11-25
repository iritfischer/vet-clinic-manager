import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';
import { Conversation, ConversationFilter, WhatsAppMessage, Client, Lead } from '@/types/leads';

interface RawMessage extends WhatsAppMessage {
  clients?: Client | null;
  leads?: Lead | null;
}

// Normalize phone number for comparison
const normalizePhone = (phone: string): string => {
  if (!phone) return '';
  // Remove all non-digits
  let normalized = phone.replace(/\D/g, '');
  // If starts with 972, convert to 0
  if (normalized.startsWith('972')) {
    normalized = '0' + normalized.slice(3);
  }
  // If doesn't start with 0, add it (for Israeli numbers)
  if (normalized.length === 9 && !normalized.startsWith('0')) {
    normalized = '0' + normalized;
  }
  return normalized;
};

export const useConversations = () => {
  const { clinicId } = useClinic();
  const [messages, setMessages] = useState<RawMessage[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all messages
  const fetchMessages = useCallback(async () => {
    if (!clinicId) return;

    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select(`
          *,
          clients:client_id(id, first_name, last_name, phone_primary, email),
          leads:lead_id(id, first_name, last_name, phone, email, status)
        `)
        .eq('clinic_id', clinicId)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      setMessages((data || []) as RawMessage[]);
    } catch (error: unknown) {
      console.error('Error fetching messages:', error);
    }
  }, [clinicId]);

  // Fetch all clients
  const fetchClients = useCallback(async () => {
    if (!clinicId) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, phone_primary, phone_secondary, email')
        .eq('clinic_id', clinicId)
        .eq('status', 'active');

      if (error) throw error;
      setClients((data || []) as Client[]);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
    }
  }, [clinicId]);

  // Fetch all leads
  const fetchLeads = useCallback(async () => {
    if (!clinicId) return;

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('clinic_id', clinicId)
        .neq('status', 'converted');

      if (error) throw error;
      setLeads(data || []);
    } catch (error: any) {
      console.error('Error fetching leads:', error);
    }
  }, [clinicId]);

  // Initial fetch
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMessages(), fetchClients(), fetchLeads()]);
      setLoading(false);
    };
    loadData();
  }, [fetchMessages, fetchClients, fetchLeads]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!clinicId) return;

    const channel = supabase
      .channel(`whatsapp-conversations-${clinicId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `clinic_id=eq.${clinicId}`,
        },
        () => {
          // Refresh messages on any change
          fetchMessages();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `clinic_id=eq.${clinicId}`,
        },
        () => {
          // Refresh leads on any change
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicId, fetchMessages, fetchLeads]);

  // Group messages into conversations
  const conversations = useMemo((): Conversation[] => {
    const conversationMap = new Map<string, Conversation>();

    // Create a phone -> client lookup
    const phoneToClient = new Map<string, Client>();
    clients.forEach(client => {
      const normalizedPrimary = normalizePhone(client.phone_primary);
      if (normalizedPrimary) {
        phoneToClient.set(normalizedPrimary, client);
      }
    });

    // Create a phone -> lead lookup
    const phoneToLead = new Map<string, Lead>();
    leads.forEach(lead => {
      const normalizedPhone = normalizePhone(lead.phone);
      if (normalizedPhone) {
        phoneToLead.set(normalizedPhone, lead);
      }
    });

    // Process messages
    messages.forEach(msg => {
      // Determine the phone number for this conversation
      let phone: string;
      if (msg.direction === 'inbound' || msg.direction === 'incoming') {
        phone = msg.sender_phone || '';
      } else {
        // For outbound, get phone from client or lead
        if (msg.clients) {
          phone = msg.clients.phone_primary || '';
        } else if (msg.leads) {
          phone = msg.leads.phone || '';
        } else {
          // Skip messages without identifiable phone
          return;
        }
      }

      if (!phone) return;

      const normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) return;

      // Get or create conversation
      let conversation = conversationMap.get(normalizedPhone);

      if (!conversation) {
        // Determine type and get associated data
        const client = msg.clients || phoneToClient.get(normalizedPhone);
        const lead = msg.leads || phoneToLead.get(normalizedPhone);

        let type: 'client' | 'lead' | 'unknown' = 'unknown';
        let name = phone;

        if (client) {
          type = 'client';
          name = `${client.first_name} ${client.last_name}`.trim();
        } else if (lead) {
          type = 'lead';
          name = lead.last_name
            ? `${lead.first_name} ${lead.last_name}`.trim()
            : lead.first_name;
        }

        conversation = {
          id: normalizedPhone,
          phone,
          type,
          name,
          clientId: client?.id,
          leadId: lead?.id,
          client: client || undefined,
          lead: lead || undefined,
          lastMessage: '',
          lastMessageTime: '',
          unreadCount: 0,
          messages: [],
        };
        conversationMap.set(normalizedPhone, conversation);
      }

      // Add message to conversation (messages are already sorted desc, so first one is latest)
      conversation.messages.push(msg);

      // Update last message if this is newer
      if (!conversation.lastMessageTime || msg.sent_at > conversation.lastMessageTime) {
        conversation.lastMessage = msg.content;
        conversation.lastMessageTime = msg.sent_at;
      }
    });

    // Convert to array and sort by last message time
    let conversationsArray = Array.from(conversationMap.values());

    // Sort conversations by last message time (most recent first)
    conversationsArray.sort((a, b) => {
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    });

    // Sort messages within each conversation (oldest first for chat display)
    conversationsArray.forEach(conv => {
      conv.messages.sort((a, b) => {
        return new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime();
      });
    });

    return conversationsArray;
  }, [messages, clients, leads]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    let result = conversations;

    // Apply type filter (filter uses plural: 'clients', 'leads' but type uses singular)
    if (filter !== 'all') {
      const typeMap: Record<string, string> = {
        clients: 'client',
        leads: 'lead',
        unknown: 'unknown',
      };
      const targetType = typeMap[filter] || filter;
      result = result.filter(conv => conv.type === targetType);
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(conv =>
        conv.name.toLowerCase().includes(query) ||
        conv.phone.includes(query) ||
        normalizePhone(conv.phone).includes(normalizePhone(query))
      );
    }

    return result;
  }, [conversations, filter, searchQuery]);

  // Get a specific conversation by phone
  const getConversationByPhone = useCallback((phone: string): Conversation | undefined => {
    const normalizedPhone = normalizePhone(phone);
    return conversations.find(conv => conv.id === normalizedPhone);
  }, [conversations]);

  // Get messages for a specific conversation
  const getMessagesForConversation = useCallback((phone: string): WhatsAppMessage[] => {
    const conversation = getConversationByPhone(phone);
    return conversation?.messages || [];
  }, [getConversationByPhone]);

  // Refresh all data
  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchMessages(), fetchClients(), fetchLeads()]);
    setLoading(false);
  }, [fetchMessages, fetchClients, fetchLeads]);

  return {
    conversations: filteredConversations,
    allConversations: conversations,
    loading,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    getConversationByPhone,
    getMessagesForConversation,
    refresh,
    // Stats
    stats: {
      total: conversations.length,
      clients: conversations.filter(c => c.type === 'client').length,
      leads: conversations.filter(c => c.type === 'lead').length,
      unknown: conversations.filter(c => c.type === 'unknown').length,
    },
  };
};
