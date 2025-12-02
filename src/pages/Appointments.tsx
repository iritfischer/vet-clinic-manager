import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useClinic } from '@/hooks/useClinic';
import { AppointmentsTable } from '@/components/appointments/AppointmentsTable';
import { AppointmentDialog } from '@/components/appointments/AppointmentDialog';
import { AppointmentFilters } from '@/components/appointments/AppointmentFilters';
import { WeekView } from '@/components/appointments/WeekView';
import { AppointmentViewToggle } from '@/components/appointments/AppointmentViewToggle';
import { useToast } from '@/hooks/use-toast';
import { startOfDay, endOfDay, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

type Appointment = Tables<'appointments'> & {
  clients?: Tables<'clients'> | null;
  pets?: Tables<'pets'> | null;
};

const Appointments = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [view, setView] = useState<'calendar' | 'table'>('calendar');
  const { clinicId } = useClinic();
  const { toast } = useToast();

  useEffect(() => {
    if (clinicId) {
      fetchAppointments();
    }
  }, [clinicId]);

  const fetchAppointments = async () => {
    if (!clinicId) return;

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          clients:client_id(id, first_name, last_name),
          pets:pet_id(id, name)
        `)
        .eq('clinic_id', clinicId)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
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

  const filteredAppointments = useMemo(() => {
    let filtered = appointments;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(apt => {
        const aptDate = new Date(apt.start_time);
        
        switch (dateFilter) {
          case 'today':
            return aptDate >= startOfDay(now) && aptDate <= endOfDay(now);
          case 'tomorrow':
            const tomorrow = addDays(now, 1);
            return aptDate >= startOfDay(tomorrow) && aptDate <= endOfDay(tomorrow);
          case 'week':
            return aptDate >= startOfWeek(now) && aptDate <= endOfWeek(now);
          case 'month':
            return aptDate >= startOfMonth(now) && aptDate <= endOfMonth(now);
          case 'past':
            return aptDate < now;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [appointments, statusFilter, dateFilter]);

  const handleSave = async (data: any) => {
    if (!clinicId) return;

    try {
      // Clean up empty strings to null for optional UUID fields
      const cleanedData = {
        ...data,
        pet_id: data.pet_id && data.pet_id !== '' ? data.pet_id : null,
        client_id: data.client_id && data.client_id !== '' ? data.client_id : null,
      };

      if (editingAppointment?.id) {
        const { error } = await supabase
          .from('appointments')
          .update(cleanedData)
          .eq('id', editingAppointment.id);

        if (error) throw error;
        toast({ title: 'התור עודכן בהצלחה' });
      } else {
        const { error } = await supabase
          .from('appointments')
          .insert({ ...cleanedData, clinic_id: clinicId });

        if (error) throw error;
        toast({ title: 'התור נוסף בהצלחה' });
      }

      setDialogOpen(false);
      setEditingAppointment(null);
      fetchAppointments();
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message || 'אירעה שגיאה בשמירת התור',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'התור נמחק בהצלחה' });
      fetchAppointments();
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAppointment(null);
  };

  const handleAppointmentClick = (_appointment: Appointment) => {
    // Single click does nothing - context menu handles actions
  };

  const handleCreateAppointment = (startTime: Date, endTime: Date) => {
    setEditingAppointment({
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      appointment_type: '',
      status: 'scheduled',
    } as Appointment);
    setDialogOpen(true);
  };

  const handleNavigateToClient = (clientId: string) => {
    navigate(`/client/${clientId}`);
  };

  const handleEditFromContext = (appointment: Appointment) => {
    handleEdit(appointment);
  };

  const handleUpdateAppointment = async (appointmentId: string, startTime: Date, endTime: Date) => {
    if (!clinicId) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
        })
        .eq('id', appointmentId);

      if (error) throw error;
      fetchAppointments();
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">יומן תורים</h1>
            <p className="text-muted-foreground mt-2">
              ניהול תורים ופגישות במרפאה
            </p>
          </div>
          <div className="flex gap-3">
            <AppointmentViewToggle view={view} onViewChange={setView} />
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 ml-2" />
              תור חדש
            </Button>
          </div>
        </div>

        <AppointmentFilters
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
        />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : view === 'calendar' ? (
          <WeekView
            appointments={filteredAppointments}
            onAppointmentClick={handleAppointmentClick}
            onCreateAppointment={handleCreateAppointment}
            onNavigateToClient={handleNavigateToClient}
            onEditAppointment={handleEditFromContext}
            onUpdateAppointment={handleUpdateAppointment}
          />
        ) : (
          <AppointmentsTable
            appointments={filteredAppointments}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

        <AppointmentDialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          onSave={handleSave}
          appointment={editingAppointment}
        />
      </div>
    </DashboardLayout>
  );
};

export default Appointments;
