import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Send,
  RefreshCw,
  MoreVertical,
  UserPlus,
  ArrowUpCircle,
  User,
  MessageCircle,
  Phone,
  Mail,
} from 'lucide-react';
import { Conversation, WhatsAppMessage } from '@/types/leads';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface ChatWindowProps {
  conversation: Conversation | null;
  onCreateLead: (phone: string) => void;
  onConvertToClient: (leadId: string) => void;
  onRefresh: () => void;
}

const isOutgoing = (direction: string): boolean => {
  return direction === 'outbound' || direction === 'outgoing';
};

export const ChatWindow = ({
  conversation,
  onCreateLead,
  onConvertToClient,
  onRefresh,
}: ChatWindowProps) => {
  const { sendMessage, isEnabled, isAuthorized } = useWhatsApp();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  // Handle send message
  const handleSend = async () => {
    if (!newMessage.trim() || sending || !conversation) return;

    const messageText = newMessage;
    setSending(true);
    setNewMessage('');

    try {
      const metadata: { clientId?: string; leadId?: string } = {};
      if (conversation.clientId) {
        metadata.clientId = conversation.clientId;
      }

      await sendMessage(conversation.phone, messageText, metadata);
      onRefresh();
    } catch (error) {
      setNewMessage(messageText);
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

  // No conversation selected
  if (!conversation) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-muted/30">
        <MessageCircle className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">בחר שיחה</h3>
        <p className="text-sm text-muted-foreground mt-1">
          בחר שיחה מהרשימה כדי להתחיל
        </p>
      </div>
    );
  }

  const getStatusBadge = () => {
    if (conversation.type === 'client') {
      return (
        <Badge className="bg-green-100 text-green-800">
          <User className="h-3 w-3 ml-1" />
          לקוח
        </Badge>
      );
    }
    if (conversation.type === 'lead') {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          <UserPlus className="h-3 w-3 ml-1" />
          ליד
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        לא מוכר
      </Badge>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-background flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className={`
            w-10 h-10 rounded-full flex items-center justify-center
            ${conversation.type === 'client' ? 'bg-green-100' :
              conversation.type === 'lead' ? 'bg-yellow-100' : 'bg-gray-100'}
          `}>
            {conversation.type === 'client' ? (
              <User className="h-5 w-5 text-green-700" />
            ) : conversation.type === 'lead' ? (
              <UserPlus className="h-5 w-5 text-yellow-700" />
            ) : (
              <MessageCircle className="h-5 w-5 text-gray-700" />
            )}
          </div>

          {/* Info */}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{conversation.name}</h3>
              {getStatusBadge()}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1" dir="ltr">
                <Phone className="h-3 w-3" />
                {conversation.phone}
              </span>
              {conversation.client?.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {conversation.client.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Create Lead Button (for unknown) */}
          {conversation.type === 'unknown' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCreateLead(conversation.phone)}
            >
              <UserPlus className="h-4 w-4 ml-2" />
              סמן כליד
            </Button>
          )}

          {/* Convert to Client Button (for leads) */}
          {conversation.type === 'lead' && conversation.leadId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onConvertToClient(conversation.leadId!)}
            >
              <ArrowUpCircle className="h-4 w-4 ml-2" />
              המר ללקוח
            </Button>
          )}

          {/* More Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 ml-2" />
                רענן שיחה
              </DropdownMenuItem>
              {conversation.type === 'client' && conversation.clientId && (
                <DropdownMenuItem
                  onClick={() => window.open(`/client/${conversation.clientId}`, '_blank')}
                >
                  <User className="h-4 w-4 ml-2" />
                  עבור לפרופיל לקוח
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {conversation.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">אין הודעות עדיין</p>
              <p className="text-sm text-muted-foreground">
                שלח את ההודעה הראשונה ל{conversation.name}
              </p>
            </div>
          ) : (
            conversation.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-background">
        {!isEnabled ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground text-sm">
              WhatsApp לא מוגדר. יש להגדיר בהגדרות המערכת.
            </p>
          </div>
        ) : !isAuthorized ? (
          <div className="text-center py-4">
            <p className="text-amber-600 text-sm">
              WhatsApp לא מחובר. יש לסרוק QR בהגדרות כדי לשלוח הודעות.
            </p>
          </div>
        ) : (
          <div className="flex gap-2">
            <Textarea
              placeholder="כתוב הודעה..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="resize-none text-right min-h-[60px]"
              rows={2}
              dir="rtl"
            />
            <Button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="h-auto bg-green-600 hover:bg-green-700 px-4"
            >
              {sending ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Message Bubble Component
const MessageBubble = ({ message }: { message: WhatsAppMessage }) => {
  const outgoing = isOutgoing(message.direction);

  return (
    <div className={`flex ${outgoing ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`
          max-w-[75%] rounded-lg px-4 py-2
          ${outgoing
            ? 'bg-green-100 text-green-900 rounded-br-none'
            : 'bg-white border text-gray-900 rounded-bl-none'
          }
        `}
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
};
