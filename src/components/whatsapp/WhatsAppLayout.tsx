import { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, CheckCircle, XCircle } from 'lucide-react';
import { useConversations } from '@/hooks/useConversations';
import { useLeads } from '@/hooks/useLeads';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { Conversation, LeadFormData } from '@/types/leads';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { LeadDialog } from './LeadDialog';
import { ConvertToClientDialog } from './ConvertToClientDialog';

export const WhatsAppLayout = () => {
  const {
    conversations,
    loading,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    stats,
    refresh,
    getConversationByPhone,
  } = useConversations();

  const { createLead, convertLeadToClient, linkMessagesToLead, leads } = useLeads();
  const { isConfigured, isAuthorized } = useWhatsApp();

  // Selected conversation
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  // Lead dialog state
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [leadDialogPhone, setLeadDialogPhone] = useState('');

  // Convert dialog state
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  // Handle conversation selection
  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation);
  }, []);

  // Handle create lead
  const handleCreateLead = useCallback((phone: string) => {
    setLeadDialogPhone(phone);
    setLeadDialogOpen(true);
  }, []);

  // Handle save lead
  const handleSaveLead = useCallback(async (data: LeadFormData) => {
    const newLead = await createLead(data);
    if (newLead) {
      // Link existing messages to the new lead
      await linkMessagesToLead(newLead.id, data.phone);
      // Refresh conversations
      await refresh();
      // Update selected conversation if it matches
      if (selectedConversation && selectedConversation.phone === data.phone) {
        const updated = getConversationByPhone(data.phone);
        if (updated) {
          setSelectedConversation({ ...updated, leadId: newLead.id, lead: newLead, type: 'lead', name: `${newLead.first_name} ${newLead.last_name || ''}`.trim() });
        }
      }
      setLeadDialogOpen(false);
      setLeadDialogPhone('');
    }
  }, [createLead, linkMessagesToLead, refresh, selectedConversation, getConversationByPhone]);

  // Handle open convert dialog
  const handleOpenConvertDialog = useCallback((leadId: string) => {
    setConvertingLeadId(leadId);
    setConvertDialogOpen(true);
  }, []);

  // Handle convert to client
  const handleConvertToClient = useCallback(async (createPet: boolean) => {
    if (!convertingLeadId) return;

    setConverting(true);
    try {
      const result = await convertLeadToClient(convertingLeadId, createPet);
      if (result) {
        await refresh();
        // Update selected conversation
        if (selectedConversation && selectedConversation.leadId === convertingLeadId) {
          const updated = getConversationByPhone(selectedConversation.phone);
          if (updated) {
            setSelectedConversation(updated);
          }
        }
        setConvertDialogOpen(false);
        setConvertingLeadId(null);
      }
    } finally {
      setConverting(false);
    }
  }, [convertingLeadId, convertLeadToClient, refresh, selectedConversation, getConversationByPhone]);

  // Get lead for convert dialog
  const convertingLead = convertingLeadId
    ? leads.find(l => l.id === convertingLeadId) || null
    : null;

  return (
    <div className="h-full flex flex-col" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background flex-shrink-0">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-2xl font-bold">WhatsApp</h1>
            <p className="text-sm text-muted-foreground">
              ניהול שיחות והודעות
            </p>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {isConfigured ? (
            <Badge variant={isAuthorized ? 'default' : 'destructive'}>
              {isAuthorized ? (
                <>
                  <CheckCircle className="h-3 w-3 ml-1" />
                  מחובר
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 ml-1" />
                  לא מחובר
                </>
              )}
            </Badge>
          ) : (
            <Badge variant="secondary">
              לא מוגדר
            </Badge>
          )}
        </div>
      </div>

      {/* Main Content - WhatsApp Web Style Layout */}
      <div className="flex-1 flex min-h-0">
        {/* Conversation List (Right side in RTL) */}
        <div className="w-[400px] min-w-[400px] flex-shrink-0 h-full overflow-y-auto border-l">
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversation?.id || null}
            onSelect={handleSelectConversation}
            filter={filter}
            onFilterChange={setFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            stats={stats}
            loading={loading}
            onRefresh={refresh}
          />
        </div>

        {/* Chat Window (Left side in RTL) */}
        <div className="flex-1 h-full overflow-hidden">
          <ChatWindow
            conversation={selectedConversation}
            onCreateLead={handleCreateLead}
            onConvertToClient={handleOpenConvertDialog}
            onRefresh={refresh}
          />
        </div>
      </div>

      {/* Lead Dialog */}
      <LeadDialog
        open={leadDialogOpen}
        onClose={() => {
          setLeadDialogOpen(false);
          setLeadDialogPhone('');
        }}
        onSave={handleSaveLead}
        initialPhone={leadDialogPhone}
      />

      {/* Convert to Client Dialog */}
      <ConvertToClientDialog
        open={convertDialogOpen}
        onClose={() => {
          setConvertDialogOpen(false);
          setConvertingLeadId(null);
        }}
        onConvert={handleConvertToClient}
        lead={convertingLead}
        converting={converting}
      />
    </div>
  );
};
