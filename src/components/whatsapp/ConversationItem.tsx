import { Conversation } from '@/types/leads';
import { Badge } from '@/components/ui/badge';
import { User, UserPlus, HelpCircle } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { he } from 'date-fns/locale';

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

const formatMessageTime = (dateString: string): string => {
  const date = new Date(dateString);
  if (isToday(date)) {
    return format(date, 'HH:mm');
  }
  if (isYesterday(date)) {
    return 'אתמול';
  }
  return format(date, 'dd/MM', { locale: he });
};

const getTypeColor = (type: Conversation['type']): string => {
  switch (type) {
    case 'client':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'lead':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'unknown':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getTypeIcon = (type: Conversation['type']) => {
  switch (type) {
    case 'client':
      return <User className="h-4 w-4" />;
    case 'lead':
      return <UserPlus className="h-4 w-4" />;
    case 'unknown':
      return <HelpCircle className="h-4 w-4" />;
    default:
      return <HelpCircle className="h-4 w-4" />;
  }
};

const getTypeLabel = (type: Conversation['type']): string => {
  switch (type) {
    case 'client':
      return 'לקוח';
    case 'lead':
      return 'ליד';
    case 'unknown':
      return 'לא מוכר';
    default:
      return '';
  }
};

export const ConversationItem = ({ conversation, isSelected, onClick }: ConversationItemProps) => {
  const lastMessagePreview = conversation.lastMessage.length > 50
    ? conversation.lastMessage.substring(0, 50) + '...'
    : conversation.lastMessage;

  return (
    <div
      onClick={onClick}
      className={`
        p-4 cursor-pointer border-b transition-colors
        hover:bg-accent
        ${isSelected ? 'bg-accent border-r-4 border-r-green-600' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Avatar with status badge */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className={`
            w-12 h-12 rounded-full flex items-center justify-center
            ${conversation.type === 'client' ? 'bg-green-100' :
              conversation.type === 'lead' ? 'bg-yellow-100' : 'bg-gray-100'}
          `}>
            {getTypeIcon(conversation.type)}
          </div>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${getTypeColor(conversation.type)}`}
          >
            {getTypeLabel(conversation.type)}
          </Badge>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium truncate">{conversation.name}</span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {conversation.lastMessageTime && formatMessageTime(conversation.lastMessageTime)}
            </span>
          </div>

          <p className="text-sm text-muted-foreground truncate">
            {lastMessagePreview || 'אין הודעות'}
          </p>

          {/* Phone number */}
          <p className="text-xs text-muted-foreground mt-1" dir="ltr">
            {conversation.phone}
          </p>
        </div>

        {/* Unread count */}
        {conversation.unreadCount > 0 && (
          <div className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
            {conversation.unreadCount}
          </div>
        )}
      </div>
    </div>
  );
};
