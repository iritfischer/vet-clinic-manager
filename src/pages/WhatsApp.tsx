import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MessageCircle,
  Settings,
  Send,
  CheckCircle,
  XCircle,
  RefreshCw,
  History,
  Users,
  Search,
} from 'lucide-react';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { useClinic } from '@/hooks/useClinic';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { messageTemplates, formatPhoneNumber, setWebhookUrl, getWebhookSettings } from '@/lib/whatsappService';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

type Client = {
  id: string;
  first_name: string;
  last_name: string;
  phone_primary: string;
  whatsapp_opt_in: boolean | null;
};

type WhatsAppMessage = {
  id: string;
  client_id: string | null;
  content: string;
  direction: string;
  sent_at: string;
  sender_phone?: string | null;
  clients?: Client | null;
};

const WhatsApp = () => {
  const { toast } = useToast();
  const { clinic, clinicId } = useClinic();
  const {
    settings,
    loading,
    checking,
    isConfigured,
    isEnabled,
    isAuthorized,
    saveSettings,
    checkStatus,
    sendMessage,
  } = useWhatsApp();

  // Settings form state
  const [instanceId, setInstanceId] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [enabled, setEnabled] = useState(false);

  // Send message state
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [messageType, setMessageType] = useState('custom');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);

  // History state
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Webhook state
  const [settingWebhook, setSettingWebhook] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);

  // Load settings into form
  useEffect(() => {
    if (settings) {
      setInstanceId(settings.instanceId || '');
      setApiToken(settings.apiToken || '');
      setEnabled(settings.isEnabled || false);
    }
  }, [settings]);

  // Load clients
  useEffect(() => {
    const fetchClients = async () => {
      if (!clinicId) return;

      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, phone_primary, whatsapp_opt_in')
        .eq('clinic_id', clinicId)
        .eq('status', 'active')
        .order('first_name');

      if (!error && data) {
        setClients(data);
        setFilteredClients(data);
      }
    };

    fetchClients();
  }, [clinicId]);

  // Subscribe to realtime updates for new incoming messages
  useEffect(() => {
    if (!clinicId) return;

    const channel = supabase
      .channel(`whatsapp-clinic-${clinicId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `clinic_id=eq.${clinicId}`,
        },
        (payload) => {
          console.log('New WhatsApp message received:', payload);
          // Reload messages to get the full data with client info
          loadMessages();
        }
      )
      .subscribe((status) => {
        console.log('WhatsApp realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicId]);

  // Filter clients on search
  useEffect(() => {
    if (!searchQuery) {
      setFilteredClients(clients);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredClients(
        clients.filter(
          (c) =>
            c.first_name.toLowerCase().includes(query) ||
            c.last_name.toLowerCase().includes(query) ||
            c.phone_primary.includes(query)
        )
      );
    }
  }, [searchQuery, clients]);

  // Load message history
  const loadMessages = async () => {
    if (!clinicId) return;

    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*, clients:client_id(id, first_name, last_name, phone_primary), sender_phone')
        .eq('clinic_id', clinicId)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setMessages(data as WhatsAppMessage[]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Handle save settings
  const handleSaveSettings = async () => {
    await saveSettings({
      instanceId,
      apiToken,
      isEnabled: enabled,
    });
  };

  // Setup webhook for receiving incoming messages
  const handleSetupWebhook = async () => {
    if (!instanceId || !apiToken) {
      toast({
        title: 'שגיאה',
        description: 'יש להזין Instance ID ו-API Token קודם',
        variant: 'destructive',
      });
      return;
    }

    setSettingWebhook(true);
    try {
      const webhookUrl = 'https://dgazghyyaeknkyxlvhdu.supabase.co/functions/v1/whatsapp-webhook';

      const result = await setWebhookUrl(
        { instanceId, apiToken, isEnabled: true },
        webhookUrl
      );

      if (result.success) {
        setWebhookStatus('מוגדר');
        toast({
          title: 'הצלחה',
          description: 'Webhook להודעות נכנסות הוגדר בהצלחה',
        });
      } else {
        toast({
          title: 'שגיאה',
          description: result.error || 'שגיאה בהגדרת webhook',
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
      setSettingWebhook(false);
    }
  };

  // Check current webhook settings
  const checkWebhookSettings = async () => {
    if (!instanceId || !apiToken) return;

    const result = await getWebhookSettings({ instanceId, apiToken, isEnabled: true });
    if (result.webhookUrl) {
      const isCorrect = result.webhookUrl.includes('whatsapp-webhook');
      setWebhookStatus(isCorrect ? 'מוגדר' : 'לא מוגדר');
    } else {
      setWebhookStatus('לא מוגדר');
    }
  };

  // Check webhook settings when settings change
  useEffect(() => {
    if (instanceId && apiToken) {
      checkWebhookSettings();
    }
  }, [instanceId, apiToken]);

  // Handle send message
  const handleSendMessage = async () => {
    if (!selectedClient || !customMessage.trim()) {
      toast({
        title: 'שגיאה',
        description: 'יש לבחור לקוח ולכתוב הודעה',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const result = await sendMessage(selectedClient.phone_primary, customMessage, {
        clientId: selectedClient.id,
      });

      if (result.success) {
        setCustomMessage('');
        setSelectedClient(null);
        loadMessages();
      }
    } finally {
      setSending(false);
    }
  };

  // Generate template message
  const generateTemplate = (type: string) => {
    if (!selectedClient || !clinic) return '';

    const clinicName = clinic.name || 'הקליניקה';
    const clientName = `${selectedClient.first_name} ${selectedClient.last_name}`;

    switch (type) {
      case 'reminder':
        return messageTemplates.appointmentReminder(
          clinicName,
          '[שם החיה]',
          '[תאריך]',
          '[שעה]'
        );
      case 'summary':
        return messageTemplates.visitSummary(
          clinicName,
          '[שם החיה]',
          '[סיכום הביקור]'
        );
      case 'vaccination':
        return messageTemplates.vaccinationReminder(
          clinicName,
          '[שם החיה]',
          '[סוג חיסון]',
          '[תאריך]'
        );
      default:
        return '';
    }
  };

  // Handle template selection
  const handleTemplateSelect = (type: string) => {
    setMessageType(type);
    if (type !== 'custom') {
      setCustomMessage(generateTemplate(type));
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">טוען...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <MessageCircle className="h-8 w-8 text-green-600" />
              WhatsApp
            </h1>
            <p className="text-muted-foreground mt-1">
              שליחת הודעות והתראות ללקוחות
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isConfigured && (
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
            )}
          </div>
        </div>

        <Tabs defaultValue="send" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="send" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              שליחת הודעה
            </TabsTrigger>
            <TabsTrigger
              value="history"
              onClick={loadMessages}
              className="flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              היסטוריה
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              הגדרות
            </TabsTrigger>
          </TabsList>

          {/* Send Message Tab */}
          <TabsContent value="send" className="space-y-6 mt-6">
            {!isConfigured || !isEnabled ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">WhatsApp לא מוגדר</h3>
                  <p className="text-muted-foreground mb-4">
                    יש להגדיר את פרטי החיבור בלשונית "הגדרות" כדי להתחיל לשלוח הודעות
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Client Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      בחירת לקוח
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="חיפוש לפי שם או טלפון..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pr-10"
                      />
                    </div>

                    <div className="max-h-[300px] overflow-y-auto border rounded-md">
                      {filteredClients.length === 0 ? (
                        <p className="p-4 text-center text-muted-foreground">
                          לא נמצאו לקוחות
                        </p>
                      ) : (
                        <div className="divide-y">
                          {filteredClients.map((client) => (
                            <div
                              key={client.id}
                              className={`p-3 cursor-pointer hover:bg-accent transition-colors ${
                                selectedClient?.id === client.id ? 'bg-accent' : ''
                              }`}
                              onClick={() => setSelectedClient(client)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">
                                    {client.first_name} {client.last_name}
                                  </p>
                                  <p className="text-sm text-muted-foreground" dir="ltr">
                                    {client.phone_primary}
                                  </p>
                                </div>
                                {client.whatsapp_opt_in && (
                                  <Badge variant="outline" className="text-green-600">
                                    מאושר
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedClient && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <p className="font-medium text-green-800">
                          נבחר: {selectedClient.first_name} {selectedClient.last_name}
                        </p>
                        <p className="text-sm text-green-600" dir="ltr">
                          {formatPhoneNumber(selectedClient.phone_primary)}@c.us
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Message Composition */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5" />
                      כתיבת הודעה
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>תבנית הודעה</Label>
                      <Select value={messageType} onValueChange={handleTemplateSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="בחר תבנית" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">הודעה חופשית</SelectItem>
                          <SelectItem value="reminder">תזכורת תור</SelectItem>
                          <SelectItem value="summary">סיכום ביקור</SelectItem>
                          <SelectItem value="vaccination">תזכורת חיסון</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>תוכן ההודעה</Label>
                      <Textarea
                        placeholder="כתוב את ההודעה כאן..."
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        rows={8}
                        className="resize-none"
                      />
                      <p className="text-xs text-muted-foreground">
                        {customMessage.length} תווים
                      </p>
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleSendMessage}
                      disabled={!selectedClient || !customMessage.trim() || sending}
                    >
                      {sending ? (
                        <>
                          <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                          שולח...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 ml-2" />
                          שלח הודעה
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>היסטוריית הודעות</CardTitle>
                  <Button variant="outline" size="sm" onClick={loadMessages}>
                    <RefreshCw
                      className={`h-4 w-4 ml-2 ${loadingMessages ? 'animate-spin' : ''}`}
                    />
                    רענן
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingMessages ? (
                  <div className="text-center py-8 text-muted-foreground">טוען...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    אין הודעות להצגה
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">תאריך</TableHead>
                        <TableHead className="text-right">לקוח</TableHead>
                        <TableHead className="text-right">כיוון</TableHead>
                        <TableHead className="text-right">תוכן</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {messages.map((msg) => (
                        <TableRow key={msg.id}>
                          <TableCell className="text-right">
                            {format(new Date(msg.sent_at), 'dd/MM/yyyy HH:mm', {
                              locale: he,
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            {msg.clients
                              ? `${msg.clients.first_name} ${msg.clients.last_name}`
                              : msg.sender_phone
                              ? <span className="text-muted-foreground" dir="ltr">{msg.sender_phone}</span>
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={msg.direction === 'outbound' ? 'default' : 'secondary'}
                            >
                              {msg.direction === 'outbound' ? 'יוצא' : 'נכנס'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right max-w-[300px] truncate">
                            {msg.content}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>הגדרות Green API</CardTitle>
                <CardDescription>
                  חבר את חשבון WhatsApp שלך דרך Green API לשליחת הודעות
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-base">הפעל אינטגרציית WhatsApp</Label>
                    <p className="text-sm text-muted-foreground">
                      אפשר שליחת הודעות WhatsApp ללקוחות
                    </p>
                  </div>
                  <Switch checked={enabled} onCheckedChange={setEnabled} />
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="instanceId">Instance ID</Label>
                    <Input
                      id="instanceId"
                      placeholder="1234567890"
                      value={instanceId}
                      onChange={(e) => setInstanceId(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      מספר ה-Instance מחשבון Green API שלך
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiToken">API Token</Label>
                    <Input
                      id="apiToken"
                      type="password"
                      placeholder="xxxxxxxxxxxxxxxxxxxx"
                      value={apiToken}
                      onChange={(e) => setApiToken(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      ה-Token לגישה ל-API
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleSaveSettings} className="flex-1">
                    שמור הגדרות
                  </Button>
                  <Button
                    variant="outline"
                    onClick={checkStatus}
                    disabled={!instanceId || !apiToken || checking}
                  >
                    {checking ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      'בדוק חיבור'
                    )}
                  </Button>
                </div>

                {/* Status Display */}
                {isConfigured && (
                  <div className="p-4 border rounded-lg space-y-2">
                    <h4 className="font-medium">סטטוס חיבור</h4>
                    <div className="flex items-center gap-2">
                      {isAuthorized ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-green-600">מחובר ומוכן לשליחה</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-red-600" />
                          <span className="text-red-600">
                            לא מחובר - יש לסרוק QR בלוח הבקרה של Green API
                          </span>
                        </>
                      )}
                    </div>
                    {settings?.connectedPhone && (
                      <p className="text-sm text-muted-foreground">
                        מספר מחובר: {settings.connectedPhone}
                      </p>
                    )}
                    {settings?.lastChecked && (
                      <p className="text-xs text-muted-foreground">
                        בדיקה אחרונה:{' '}
                        {format(new Date(settings.lastChecked), 'dd/MM/yyyy HH:mm', {
                          locale: he,
                        })}
                      </p>
                    )}
                  </div>
                )}

                {/* Webhook Setup for Incoming Messages */}
                {isConfigured && (
                  <div className="p-4 border rounded-lg space-y-3">
                    <h4 className="font-medium">הגדרת קבלת הודעות נכנסות</h4>
                    <p className="text-sm text-muted-foreground">
                      כדי לקבל הודעות נכנסות מלקוחות, יש להגדיר webhook ב-Green API
                    </p>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        onClick={handleSetupWebhook}
                        disabled={settingWebhook}
                      >
                        {settingWebhook ? (
                          <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                        ) : null}
                        הגדר Webhook אוטומטית
                      </Button>
                      {webhookStatus && (
                        <Badge variant={webhookStatus === 'מוגדר' ? 'default' : 'secondary'}>
                          {webhookStatus === 'מוגדר' ? (
                            <CheckCircle className="h-3 w-3 ml-1" />
                          ) : (
                            <XCircle className="h-3 w-3 ml-1" />
                          )}
                          {webhookStatus}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Instructions */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <h4 className="font-medium">הוראות הגדרה:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>
                      היכנס ל-
                      <a
                        href="https://green-api.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        green-api.com
                      </a>
                      {' '}וצור חשבון
                    </li>
                    <li>צור Instance חדש ורשום את ה-Instance ID וה-API Token</li>
                    <li>בלוח הבקרה של Green API, סרוק את ה-QR עם WhatsApp</li>
                    <li>הזן את הפרטים כאן ושמור</li>
                    <li>לחץ "בדוק חיבור" לוודא שהכל עובד</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default WhatsApp;
