import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, RefreshCw, Users, UserPlus, HelpCircle, MessageCircle } from 'lucide-react';
import { Conversation, ConversationFilter } from '@/types/leads';
import { ConversationItem } from './ConversationItem';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
  filter: ConversationFilter;
  onFilterChange: (filter: ConversationFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  stats: {
    total: number;
    clients: number;
    leads: number;
    unknown: number;
  };
  loading: boolean;
  onRefresh: () => void;
}

const filterOptions: { value: ConversationFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'הכל', icon: <MessageCircle className="h-4 w-4" /> },
  { value: 'clients', label: 'לקוחות', icon: <Users className="h-4 w-4" /> },
  { value: 'leads', label: 'לידים', icon: <UserPlus className="h-4 w-4" /> },
  { value: 'unknown', label: 'לא מוכרים', icon: <HelpCircle className="h-4 w-4" /> },
];

export const ConversationList = ({
  conversations,
  selectedId,
  onSelect,
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  stats,
  loading,
  onRefresh,
}: ConversationListProps) => {
  const getCountForFilter = (filterValue: ConversationFilter): number => {
    switch (filterValue) {
      case 'all':
        return stats.total;
      case 'clients':
        return stats.clients;
      case 'leads':
        return stats.leads;
      case 'unknown':
        return stats.unknown;
      default:
        return 0;
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש שיחות..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pr-10 text-right"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 flex-wrap">
          {filterOptions.map((option) => (
            <Button
              key={option.value}
              variant={filter === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFilterChange(option.value)}
              className="flex items-center gap-1"
            >
              {option.icon}
              <span>{option.label}</span>
              <Badge
                variant="secondary"
                className={`mr-1 text-xs ${
                  filter === option.value ? 'bg-white/20' : ''
                }`}
              >
                {getCountForFilter(option.value)}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* Refresh button */}
      <div className="px-4 py-2 border-b flex justify-between items-center">
        <span className="text-sm text-muted-foreground">
          {conversations.length} שיחות
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">טוען...</div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? 'לא נמצאו שיחות תואמות' : 'אין שיחות להצגה'}
            </p>
            {filter !== 'all' && !searchQuery && (
              <Button
                variant="link"
                onClick={() => onFilterChange('all')}
                className="mt-2"
              >
                הצג את כל השיחות
              </Button>
            )}
          </div>
        ) : (
          <div>
            {conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedId === conversation.id}
                onClick={() => onSelect(conversation)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
