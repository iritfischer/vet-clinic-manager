import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useClinic } from '@/hooks/useClinic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  Stethoscope,
  Bell,
  CheckCircle2,
  Syringe,
  Pill,
  FileText,
  Download,
  Plus,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

type Visit = Tables<'visits'>;
type Reminder = Tables<'reminders'>;

interface TimelineEvent {
  id: string;
  type: 'visit' | 'reminder_completed';
  date: string;
  title: string;
  subtitle?: string;
  details?: any;
  status?: string;
  icon: React.ReactNode;
  color: string;
}

interface PetTimelineProps {
  clientId: string;
  petId: string;
  petName: string;
  onNewVisit: () => void;
  onExportPDF?: (visitId: string) => void;
}

const reminderTypeLabels: Record<string, string> = {
  follow_up: 'בדיקת מעקב',
  vaccination: 'חיסון',
  medication: 'תרופות',
  test_results: 'תוצאות בדיקה',
  general: 'כללי',
};

// תרגום סוגי ביקור
const visitTypeLabels: Record<string, string> = {
  checkup: 'בדיקה כללית',
  vaccination: 'חיסון',
  surgery: 'ניתוח',
  dental: 'טיפול שיניים',
  emergency: 'חירום',
  grooming: 'טיפוח',
  other: 'אחר',
};

// פונקציה לתרגום סוג ביקור
const formatVisitType = (visitType: string): string => {
  // אם זה חיסון עם פרטים (vaccination:rabies:כלבת)
  if (visitType.startsWith('vaccination:')) {
    const parts = visitType.split(':');
    const vaccineName = parts[2] || parts[1] || 'חיסון';
    return `חיסון - ${vaccineName}`;
  }
  // אחרת, תרגם לפי המילון
  return visitTypeLabels[visitType] || visitType;
};

export const PetTimeline = ({ clientId, petId, petName, onNewVisit, onExportPDF }: PetTimelineProps) => {
  const { clinicId } = useClinic();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  useEffect(() => {
    if (clinicId && petId) {
      fetchTimelineData();
    }
  }, [clinicId, petId]);

  const fetchTimelineData = async () => {
    if (!clinicId) return;

    try {
      // Fetch visits
      const { data: visits } = await supabase
        .from('visits')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('pet_id', petId)
        .order('visit_date', { ascending: false });

      // Fetch completed reminders
      const { data: reminders } = await supabase
        .from('reminders')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('pet_id', petId)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false });

      // Convert to timeline events
      const timelineEvents: TimelineEvent[] = [];

      // Add visits
      visits?.forEach(visit => {
        // בחר אייקון וצבע מתאים לסוג הביקור
        const isVaccination = visit.visit_type.startsWith('vaccination');
        timelineEvents.push({
          id: visit.id,
          type: 'visit',
          date: visit.visit_date,
          title: formatVisitType(visit.visit_type),
          subtitle: visit.chief_complaint || undefined,
          details: visit,
          status: visit.status || 'open',
          icon: isVaccination ? <Syringe className="h-4 w-4" /> : <Stethoscope className="h-4 w-4" />,
          color: isVaccination ? 'bg-green-500' : 'bg-blue-500',
        });
      });

      // Add completed reminders as milestones
      reminders?.forEach(reminder => {
        const iconMap: Record<string, React.ReactNode> = {
          vaccination: <Syringe className="h-4 w-4" />,
          medication: <Pill className="h-4 w-4" />,
          follow_up: <CheckCircle2 className="h-4 w-4" />,
          test_results: <FileText className="h-4 w-4" />,
          general: <Bell className="h-4 w-4" />,
        };

        const colorMap: Record<string, string> = {
          vaccination: 'bg-green-500',
          medication: 'bg-purple-500',
          follow_up: 'bg-orange-500',
          test_results: 'bg-cyan-500',
          general: 'bg-gray-500',
        };

        timelineEvents.push({
          id: reminder.id,
          type: 'reminder_completed',
          date: reminder.updated_at || reminder.due_date,
          title: `${reminderTypeLabels[reminder.reminder_type] || reminder.reminder_type} - הושלם`,
          subtitle: reminder.notes || undefined,
          details: reminder,
          status: 'completed',
          icon: iconMap[reminder.reminder_type] || <Bell className="h-4 w-4" />,
          color: colorMap[reminder.reminder_type] || 'bg-gray-500',
        });
      });

      // Sort all events by date (newest first)
      timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setEvents(timelineEvents);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
    open: { label: 'פתוח', variant: 'default' },
    completed: { label: 'הושלם', variant: 'secondary' },
    cancelled: { label: 'בוטל', variant: 'destructive' },
  };

  const toggleExpand = (eventId: string) => {
    setExpandedEvent(expandedEvent === eventId ? null : eventId);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">טוען ציר זמן...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card dir="rtl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>ציר זמן - {petName}</CardTitle>
          <Button size="sm" onClick={onNewVisit}>
            <Plus className="h-4 w-4 ml-2" />
            ביקור חדש
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            אין אירועים רשומים
          </p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute right-[10px] top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="relative pr-8">
                  {/* Timeline dot */}
                  <div className={`absolute right-0 w-5 h-5 rounded-full ${event.color} flex items-center justify-center text-white z-10`}>
                    {event.icon}
                  </div>

                  {event.type === 'visit' ? (
                    <div className="border rounded-lg overflow-hidden">
                      {/* Header - clickable */}
                      <button
                        onClick={() => toggleExpand(event.id)}
                        className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-medium">{event.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(event.date), 'dd/MM/yyyy HH:mm', { locale: he })}
                            </p>
                          </div>
                          <Badge variant={statusConfig[event.status || 'open']?.variant || 'default'}>
                            {statusConfig[event.status || 'open']?.label || event.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {expandedEvent === event.id ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                          {onExportPDF && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onExportPDF(event.id);
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </button>

                      {/* Expanded content */}
                      {expandedEvent === event.id && (
                        <div className="p-4 pt-0 border-t bg-accent/10">
                          <div className="space-y-4 pt-4">
                            {event.details?.chief_complaint && (
                              <div>
                                <p className="text-sm font-semibold mb-1">תלונה עיקרית</p>
                                <p className="text-sm text-muted-foreground">{event.details.chief_complaint}</p>
                              </div>
                            )}

                            {event.details?.diagnoses && Array.isArray(event.details.diagnoses) && event.details.diagnoses.length > 0 && (
                              <div>
                                <p className="text-sm font-semibold mb-2">אבחנות</p>
                                <div className="space-y-1">
                                  {event.details.diagnoses.map((d: any, idx: number) => (
                                    <div key={idx} className="text-sm bg-background rounded p-2">
                                      <p className="font-medium">{d.diagnosis}</p>
                                      {d.notes && <p className="text-muted-foreground text-xs mt-1">{d.notes}</p>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {event.details?.treatments && Array.isArray(event.details.treatments) && event.details.treatments.length > 0 && (
                              <div>
                                <p className="text-sm font-semibold mb-2">טיפולים</p>
                                <div className="space-y-1">
                                  {event.details.treatments.map((t: any, idx: number) => (
                                    <div key={idx} className="text-sm bg-background rounded p-2">
                                      <p className="font-medium">{t.treatment}</p>
                                      {t.notes && <p className="text-muted-foreground text-xs mt-1">{t.notes}</p>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {event.details?.medications && Array.isArray(event.details.medications) && event.details.medications.length > 0 && (
                              <div>
                                <p className="text-sm font-semibold mb-2">תרופות</p>
                                <div className="space-y-1">
                                  {event.details.medications.map((m: any, idx: number) => (
                                    <div key={idx} className="text-sm bg-background rounded p-2">
                                      <p className="font-medium">{m.medication}</p>
                                      {m.dosage && <p className="text-muted-foreground text-xs">מינון: {m.dosage}</p>}
                                      {m.frequency && <p className="text-muted-foreground text-xs">תדירות: {m.frequency}</p>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {event.details?.client_summary && (
                              <div className="pt-2 border-t">
                                <p className="text-sm font-semibold mb-1">סיכום ללקוח</p>
                                <p className="text-sm text-muted-foreground bg-primary/5 rounded p-3">
                                  {event.details.client_summary}
                                </p>
                              </div>
                            )}

                            {!event.details?.chief_complaint &&
                             !event.details?.diagnoses?.length &&
                             !event.details?.treatments?.length &&
                             !event.details?.medications?.length &&
                             !event.details?.client_summary && (
                              <p className="text-sm text-muted-foreground">אין פרטים נוספים לביקור זה</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Milestone (completed reminder)
                    <div className="border rounded-lg p-4 bg-accent/10">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{event.title}</p>
                        <Badge variant="outline" className="text-xs">אבן דרך</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.date), 'dd/MM/yyyy', { locale: he })}
                      </p>
                      {event.subtitle && (
                        <p className="text-sm text-muted-foreground mt-1">{event.subtitle}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
