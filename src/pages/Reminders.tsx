import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Check, Bell, MessageCircle } from 'lucide-react';
import { format, isToday, isTomorrow, isPast, addDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { messageTemplates } from '@/lib/whatsappService';

type Reminder = Tables<'reminders'> & {
  clients?: Tables<'clients'> | null;
  pets?: Tables<'pets'> | null;
};

const reminderTypeLabels: Record<string, string> = {
  follow_up: 'בדיקת מעקב',
  vaccination: 'חיסון',
  medication: 'תרופות',
  test_results: 'תוצאות בדיקה',
  general: 'כללי',
};

const Reminders = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'completed'>('open');
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const { clinicId, clinic } = useClinic();
  const { toast } = useToast();
  const { sendMessage, isEnabled: whatsappEnabled, isConfigured: whatsappConfigured } = useWhatsApp();

  useEffect(() => {
    if (clinicId) {
      fetchReminders();
    }
  }, [clinicId, filter]);

  const fetchReminders = async () => {
    if (!clinicId) return;

    try {
      let query = supabase
        .from('reminders')
        .select(`
          *,
          clients:client_id(*),
          pets:pet_id(*)
        `)
        .eq('clinic_id', clinicId)
        .order('due_date', { ascending: true });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReminders(data || []);
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateReminderStatus = async (id: string, status: string) => {
    try {
      // Find the reminder to get its details
      const reminder = reminders.find(r => r.id === id);

      const { error } = await supabase
        .from('reminders')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      // If marking as completed, also update related appointment status
      if (status === 'completed' && reminder) {
        // Find and update the related appointment
        await supabase
          .from('appointments')
          .update({ status: 'completed' })
          .eq('client_id', reminder.client_id)
          .eq('pet_id', reminder.pet_id)
          .ilike('appointment_type', `%${reminderTypeLabels[reminder.reminder_type] || reminder.reminder_type}%`)
          .eq('status', 'scheduled');
      }

      toast({
        title: 'הצלחה',
        description: status === 'completed' ? 'התזכורת סומנה כבוצעה ותוצג בציר הזמן' : 'התזכורת עודכנה',
      });

      fetchReminders();
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getDueDateBadge = (dueDate: string) => {
    const date = new Date(dueDate);

    if (isPast(date) && !isToday(date)) {
      return <Badge variant="destructive">באיחור</Badge>;
    }
    if (isToday(date)) {
      return <Badge variant="default" className="bg-orange-500">היום</Badge>;
    }
    if (isTomorrow(date)) {
      return <Badge variant="secondary">מחר</Badge>;
    }
    if (date <= addDays(new Date(), 7)) {
      return <Badge variant="outline">השבוע</Badge>;
    }
    return null;
  };

  const getReminderTypeIcon = (type: string) => {
    switch (type) {
      case 'vaccination':
        return '💉';
      case 'medication':
        return '💊';
      case 'follow_up':
        return '🔄';
      case 'test_results':
        return '📋';
      default:
        return '📌';
    }
  };

  const sendWhatsAppReminder = async (reminder: Reminder) => {
    if (!reminder.clients?.phone_primary || !reminder.pets?.name) return;

    const clinicName = clinic?.name || 'המרפאה הווטרינרית';
    const petName = reminder.pets.name;
    const dueDate = format(new Date(reminder.due_date), 'dd/MM/yyyy', { locale: he });

    let message = '';
    if (reminder.reminder_type === 'vaccination') {
      message = messageTemplates.vaccinationReminder(
        clinicName,
        petName,
        reminder.notes || reminderTypeLabels[reminder.reminder_type],
        dueDate
      );
    } else {
      message = messageTemplates.generalReminder(
        clinicName,
        petName,
        `${reminderTypeLabels[reminder.reminder_type] || reminder.reminder_type} בתאריך ${dueDate}${reminder.notes ? `\n${reminder.notes}` : ''}`
      );
    }

    // If Green API is configured, use it
    if (whatsappConfigured && whatsappEnabled) {
      setSendingReminderId(reminder.id);
      try {
        const result = await sendMessage(reminder.clients.phone_primary, message, {
          clientId: reminder.client_id,
          reminderId: reminder.id,
        });

        if (result.success) {
          // Update reminder to mark that WhatsApp was sent
          await supabase
            .from('reminders')
            .update({
              last_channel: 'whatsapp',
              updated_at: new Date().toISOString(),
            })
            .eq('id', reminder.id);

          fetchReminders();
        }
      } finally {
        setSendingReminderId(null);
      }
    } else {
      // Fallback to wa.me link
      const url = `https://wa.me/${reminder.clients.phone_primary.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    }
  };

  // Stats
  const todayReminders = reminders.filter(r => isToday(new Date(r.due_date)) && r.status === 'open').length;
  const overdueReminders = reminders.filter(r => isPast(new Date(r.due_date)) && !isToday(new Date(r.due_date)) && r.status === 'open').length;
  const weekReminders = reminders.filter(r => {
    const date = new Date(r.due_date);
    return date <= addDays(new Date(), 7) && !isPast(date) && r.status === 'open';
  }).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">תזכורות ומעקב</h1>
            <p className="text-muted-foreground mt-2">
              ניהול תזכורות פולואו אפ, חיסונים ותרופות
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">באיחור</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{overdueReminders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">היום</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{todayReminders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">השבוע הקרוב</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{weekReminders}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">סינון:</span>
          <Select value={filter} onValueChange={(value: 'all' | 'open' | 'completed') => setFilter(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">פתוחות</SelectItem>
              <SelectItem value="completed">הושלמו</SelectItem>
              <SelectItem value="all">הכל</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reminders Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : reminders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">אין תזכורות {filter === 'open' ? 'פתוחות' : filter === 'completed' ? 'שהושלמו' : ''}</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>סוג</TableHead>
                  <TableHead>תאריך</TableHead>
                  <TableHead>לקוח</TableHead>
                  <TableHead>חיית מחמד</TableHead>
                  <TableHead>הערות</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead className="text-end">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reminders.map((reminder) => (
                  <TableRow key={reminder.id}>
                    <TableCell>
                      <span className="text-lg ml-2">{getReminderTypeIcon(reminder.reminder_type)}</span>
                      {reminderTypeLabels[reminder.reminder_type] || reminder.reminder_type}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {format(new Date(reminder.due_date), 'dd/MM/yyyy', { locale: he })}
                        {getDueDateBadge(reminder.due_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {reminder.clients ? `${reminder.clients.first_name} ${reminder.clients.last_name}` : '-'}
                    </TableCell>
                    <TableCell>
                      {reminder.pets?.name || '-'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {reminder.notes || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={reminder.status === 'completed' ? 'default' : 'secondary'}>
                        {reminder.status === 'completed' ? 'הושלם' : 'פתוח'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex items-center gap-2 justify-end">
                        {reminder.status === 'open' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateReminderStatus(reminder.id, 'completed')}
                            title="סמן כבוצע"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        {reminder.clients?.phone_primary && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => sendWhatsAppReminder(reminder)}
                            title="שלח תזכורת WhatsApp"
                            disabled={sendingReminderId === reminder.id}
                          >
                            {sendingReminderId === reminder.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                            ) : (
                              <MessageCircle className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reminders;
