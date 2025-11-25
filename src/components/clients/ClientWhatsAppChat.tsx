import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface WhatsAppMessage {
  id: string;
  content: string;
  direction: 'inbound' | 'outbound' | 'incoming' | 'outgoing';
  sent_at: string;
  created_at: string;
}

interface ClientWhatsAppChatProps {
  clientId: string;
  clientName: string;
  clientPhone: string;
}

export const ClientWhatsAppChat = ({ clientId, clientName, clientPhone }: ClientWhatsAppChatProps) => {
  const { clinicId } = useClinic();
  const { sendMessage, isEnabled, isConfigured, isAuthorized } = useWhatsApp();
  useToast(); // Hook needed for future error handling

  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Normalize phone number to get last 9 digits for matching
  const normalizePhoneForSearch = (phone: string): string => {
    if (!phone) return '';
    return phone.replace(/\D/g, '').slice(-9);
  };

  // Fetch messages for this client
  const fetchMessages = async () => {
    if (!clinicId || !clientId) {
      return;
    }

    try {
      // First get messages by client_id
      const { data: clientMessages, error: clientError } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('client_id', clientId);

      if (clientError) throw clientError;

      // Also get incoming messages by phone that might not be linked to client_id
      const normalizedPhone = normalizePhoneForSearch(clientPhone);
      let phoneMessages: typeof clientMessages = [];

      if (normalizedPhone) {
        const { data: phoneMsgs, error: phoneError } = await supabase
          .from('whatsapp_messages')
          .select('*')
          .eq('clinic_id', clinicId)
          .ilike('sender_phone', `%${normalizedPhone}%`)
          .is('client_id', null);

        if (!phoneError && phoneMsgs) {
          phoneMessages = phoneMsgs;
        }
      }

      // Combine and deduplicate
      const allMessages = [...(clientMessages || []), ...phoneMessages];
      const uniqueMessages = allMessages.filter((msg, index, self) =>
        index === self.findIndex(m => m.id === msg.id)
      );

      // Sort by sent_at
      uniqueMessages.sort((a, b) =>
        new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
      );

      setMessages(uniqueMessages as WhatsAppMessage[]);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Subscribe to realtime updates for new messages
    // Listen to all clinic messages and filter client-side (since Supabase realtime doesn't support ILIKE)
    if (clinicId && clientId) {
      const normalizedPhone = normalizePhoneForSearch(clientPhone);

      const channel = supabase
        .channel(`whatsapp-messages-client-${clientId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'whatsapp_messages',
            filter: `clinic_id=eq.${clinicId}`,
          },
          (payload) => {
            const newMsg = payload.new as WhatsAppMessage & { client_id?: string; sender_phone?: string };

            // Check if this message belongs to this client (by client_id or phone)
            const isForThisClient =
              newMsg.client_id === clientId ||
              (newMsg.sender_phone && newMsg.sender_phone.includes(normalizedPhone));

            if (isForThisClient) {
              setMessages((prev) => {
                // Check if message already exists
                if (prev.some(m => m.id === newMsg.id)) {
                  return prev;
                }
                return [...prev, newMsg];
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [clinicId, clientId, clientPhone]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send new message
  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage;
    setSending(true);
    setNewMessage(''); // Clear immediately for better UX

    // Add optimistic message
    const optimisticMessage: WhatsAppMessage = {
      id: `temp-${Date.now()}`,
      content: messageText,
      direction: 'outbound',
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const result = await sendMessage(clientPhone, messageText, {
        clientId,
      });

      if (result.success) {
        // Refresh to get the real message with correct ID
        // Small delay to ensure DB has the message
        setTimeout(() => {
          fetchMessages();
        }, 500);
      } else {
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        setNewMessage(messageText); // Restore message
      }
    } catch (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setNewMessage(messageText); // Restore message
    } finally {
      setSending(false);
    }
  };

  // Handle Enter key to send
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // If WhatsApp is not configured
  if (!isConfigured || !isEnabled) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">WhatsApp לא מוגדר</p>
          <p className="text-sm text-muted-foreground">
            יש להגדיר את חיבור WhatsApp בהגדרות כדי לשלוח ולקבל הודעות
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between flex-row-reverse">
          <div className="flex items-center gap-2 flex-row-reverse">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-right">
              <CardTitle className="text-lg">שיחת WhatsApp</CardTitle>
              <p className="text-sm text-muted-foreground" dir="ltr">{clientPhone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={isAuthorized ? 'default' : 'secondary'}
              className={isAuthorized ? 'bg-green-100 text-green-800' : ''}
            >
              {isAuthorized ? 'מחובר' : 'לא מחובר'}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchMessages}
              title="רענן הודעות"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">טוען הודעות...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">אין הודעות עדיין</p>
              <p className="text-sm text-muted-foreground">שלח את ההודעה הראשונה ל{clientName}</p>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              {messages.map((message) => {
                const isOutgoing = message.direction === 'outbound' || message.direction === 'outgoing';
                return (
                <div
                  key={message.id}
                  className={`flex ${isOutgoing ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-4 py-2 ${
                      isOutgoing
                        ? 'bg-green-100 text-green-900'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap text-right" dir="rtl">
                      {message.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 text-left" dir="ltr">
                      {format(new Date(message.sent_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                    </p>
                  </div>
                </div>
              );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Input Area */}
      <div className="p-4 border-t flex-shrink-0">
        <div className="flex gap-2 flex-row-reverse">
          <Textarea
            placeholder="כתוב הודעה..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="resize-none text-right min-h-[80px]"
            rows={3}
            dir="rtl"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending || !isAuthorized}
            className="h-auto bg-green-600 hover:bg-green-700 px-4"
          >
            {sending ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        {!isAuthorized && (
          <p className="text-xs text-amber-600 mt-2 text-right">
            WhatsApp לא מחובר. יש לסרוק QR בהגדרות כדי לשלוח הודעות.
          </p>
        )}
      </div>
    </Card>
  );
};
