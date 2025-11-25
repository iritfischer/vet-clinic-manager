import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, PawPrint, FileText, Loader2 } from 'lucide-react';
import { useClinic } from '@/hooks/useClinic';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, format } from 'date-fns';

interface DashboardStats {
  appointmentsToday: number;
  pendingAppointments: number;
  activeClients: number;
  totalPets: number;
  dogsCount: number;
  catsCount: number;
  visitsThisWeek: number;
}

interface UpcomingAppointment {
  id: string;
  start_time: string;
  appointment_type: string;
  pets: { name: string; species: string; breed: string } | null;
  clients: { first_name: string; last_name: string } | null;
}

interface PendingReminder {
  id: string;
  reminder_type: string;
  due_date: string;
  status: string;
  pets: { name: string } | null;
  clients: { first_name: string; last_name: string } | null;
}

const Dashboard = () => {
  const { clinicId, loading: clinicLoading } = useClinic();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    appointmentsToday: 0,
    pendingAppointments: 0,
    activeClients: 0,
    totalPets: 0,
    dogsCount: 0,
    catsCount: 0,
    visitsThisWeek: 0,
  });
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
  const [pendingReminders, setPendingReminders] = useState<PendingReminder[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!clinicId) return;

      try {
        const today = new Date();
        const weekStart = startOfWeek(today, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

        // Fetch all data in parallel
        const [
          appointmentsTodayResult,
          pendingAppointmentsResult,
          clientsResult,
          petsResult,
          visitsResult,
          upcomingResult,
          remindersResult,
        ] = await Promise.all([
          // Today's appointments
          supabase
            .from('appointments')
            .select('id', { count: 'exact' })
            .eq('clinic_id', clinicId)
            .gte('start_time', startOfDay(today).toISOString())
            .lte('start_time', endOfDay(today).toISOString()),

          // Pending appointments today
          supabase
            .from('appointments')
            .select('id', { count: 'exact' })
            .eq('clinic_id', clinicId)
            .eq('status', 'pending')
            .gte('start_time', startOfDay(today).toISOString())
            .lte('start_time', endOfDay(today).toISOString()),

          // Active clients
          supabase
            .from('clients')
            .select('id', { count: 'exact' })
            .eq('clinic_id', clinicId)
            .eq('status', 'active'),

          // Pets with species breakdown
          supabase
            .from('pets')
            .select('id, species')
            .eq('clinic_id', clinicId),

          // Visits this week
          supabase
            .from('visits')
            .select('id', { count: 'exact' })
            .eq('clinic_id', clinicId)
            .gte('visit_date', weekStart.toISOString())
            .lte('visit_date', weekEnd.toISOString()),

          // Upcoming appointments (next 3)
          supabase
            .from('appointments')
            .select(`
              id,
              start_time,
              appointment_type,
              pets:pet_id(name, species, breed),
              clients:client_id(first_name, last_name)
            `)
            .eq('clinic_id', clinicId)
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true })
            .limit(3),

          // Pending reminders
          supabase
            .from('reminders')
            .select(`
              id,
              reminder_type,
              due_date,
              status,
              pets:pet_id(name),
              clients:client_id(first_name, last_name)
            `)
            .eq('clinic_id', clinicId)
            .in('status', ['pending', 'open'])
            .order('due_date', { ascending: true })
            .limit(5),
        ]);

        // Calculate pet species breakdown
        const pets = petsResult.data || [];
        const dogsCount = pets.filter(p => p.species === 'dog' || p.species === 'כלב').length;
        const catsCount = pets.filter(p => p.species === 'cat' || p.species === 'חתול').length;

        setStats({
          appointmentsToday: appointmentsTodayResult.count || 0,
          pendingAppointments: pendingAppointmentsResult.count || 0,
          activeClients: clientsResult.count || 0,
          totalPets: pets.length,
          dogsCount,
          catsCount,
          visitsThisWeek: visitsResult.count || 0,
        });

        setUpcomingAppointments(upcomingResult.data as UpcomingAppointment[] || []);
        setPendingReminders(remindersResult.data as PendingReminder[] || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!clinicLoading) {
      fetchDashboardData();
    }
  }, [clinicId, clinicLoading]);

  const statsCards = [
    {
      title: 'תורים היום',
      value: stats.appointmentsToday.toString(),
      description: stats.pendingAppointments > 0 ? `${stats.pendingAppointments} ממתינים לאישור` : 'כל התורים מאושרים',
      icon: Calendar,
    },
    {
      title: 'לקוחות פעילים',
      value: stats.activeClients.toString(),
      description: 'סה"כ לקוחות במערכת',
      icon: Users,
    },
    {
      title: 'חיות מחמד',
      value: stats.totalPets.toString(),
      description: `${stats.dogsCount} כלבים, ${stats.catsCount} חתולים`,
      icon: PawPrint,
    },
    {
      title: 'ביקורים השבוע',
      value: stats.visitsThisWeek.toString(),
      description: stats.visitsThisWeek > 0 ? `ממוצע ${(stats.visitsThisWeek / 7).toFixed(1)} ליום` : 'אין ביקורים השבוע',
      icon: FileText,
    },
  ];

  const getAppointmentTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'checkup': 'בדיקה',
      'vaccination': 'חיסון',
      'surgery': 'ניתוח',
      'grooming': 'טיפוח',
      'consultation': 'ייעוץ',
      'follow_up': 'בדיקת מעקב',
      'emergency': 'חירום',
    };
    return types[type] || type;
  };

  const getReminderTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'vaccination': 'חיסון',
      'checkup': 'בדיקה',
      'follow_up': 'מעקב',
      'medication': 'תרופות',
      'appointment': 'תור',
    };
    return types[type] || type;
  };

  if (clinicLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">דשבורד</h1>
          <p className="text-muted-foreground mt-1">
            סקירה כללית של פעילות המרפאה
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat) => (
            <Card key={stat.title} className="border-border/50 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>תורים קרובים</CardTitle>
              <CardDescription>התורים הבאים ביומן</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingAppointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    אין תורים קרובים
                  </p>
                ) : (
                  upcomingAppointments.map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <div className="text-right">
                        <p className="font-medium">
                          {appointment.pets?.name || 'לא צוין'} - {appointment.pets?.breed || appointment.pets?.species || ''}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          בעלים: {appointment.clients?.first_name} {appointment.clients?.last_name}
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">
                          {format(new Date(appointment.start_time), 'HH:mm')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getAppointmentTypeLabel(appointment.appointment_type)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>תזכורות דחופות</CardTitle>
              <CardDescription>פעולות הדורשות תשומת לב</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingReminders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    אין תזכורות פתוחות
                  </p>
                ) : (
                  pendingReminders.map((reminder) => (
                    <div key={reminder.id} className="flex items-start gap-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                      <div className="h-2 w-2 rounded-full bg-warning mt-2" />
                      <div className="flex-1 text-right">
                        <p className="font-medium">
                          {getReminderTypeLabel(reminder.reminder_type)} - {reminder.pets?.name || 'לא צוין'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {reminder.clients?.first_name} {reminder.clients?.last_name} • {format(new Date(reminder.due_date), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
