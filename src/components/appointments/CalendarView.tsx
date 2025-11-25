import { useState } from 'react';
import { Tables } from '@/integrations/supabase/types';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Clock, User, PawPrint } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type Appointment = Tables<'appointments'> & {
  clients?: Tables<'clients'> | null;
  pets?: Tables<'pets'> | null;
};

interface CalendarViewProps {
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
}

const statusConfig = {
  scheduled: { label: 'מתוזמן', variant: 'default' as const, color: 'bg-primary/10 border-primary' },
  confirmed: { label: 'אושר', variant: 'secondary' as const, color: 'bg-secondary/10 border-secondary' },
  completed: { label: 'הושלם', variant: 'outline' as const, color: 'bg-muted border-muted-foreground' },
  cancelled: { label: 'בוטל', variant: 'destructive' as const, color: 'bg-destructive/10 border-destructive' },
  no_show: { label: 'לא הגיע', variant: 'destructive' as const, color: 'bg-destructive/10 border-destructive' },
};

export const CalendarView = ({ appointments, onAppointmentClick }: CalendarViewProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const appointmentsOnSelectedDate = appointments.filter((apt) =>
    isSameDay(new Date(apt.start_time), selectedDate)
  );

  const appointmentDates = appointments.map((apt) => new Date(apt.start_time));

  const handlePreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <Card className="lg:col-span-2 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">
            {format(currentMonth, 'MMMM yyyy', { locale: he })}
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && setSelectedDate(date)}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          locale={he}
          modifiers={{
            hasAppointment: appointmentDates,
          }}
          modifiersStyles={{
            hasAppointment: {
              fontWeight: 'bold',
              backgroundColor: 'hsl(var(--primary) / 0.1)',
            },
          }}
          className="rounded-md border-0 pointer-events-auto"
        />
      </Card>

      {/* Appointments for selected date */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">
              תורים ליום {format(selectedDate, 'dd/MM/yyyy', { locale: he })}
            </h3>
            <p className="text-sm text-muted-foreground">
              {appointmentsOnSelectedDate.length} תורים
            </p>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {appointmentsOnSelectedDate.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                אין תורים ביום זה
              </div>
            ) : (
              appointmentsOnSelectedDate
                .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                .map((appointment) => (
                  <div
                    key={appointment.id}
                    onClick={() => onAppointmentClick(appointment)}
                    className={cn(
                      'p-4 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all',
                      statusConfig[appointment.status as keyof typeof statusConfig]?.color || 'bg-card border-border'
                    )}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">
                            {format(new Date(appointment.start_time), 'HH:mm')} - {format(new Date(appointment.end_time), 'HH:mm')}
                          </span>
                        </div>
                        <Badge variant={statusConfig[appointment.status as keyof typeof statusConfig]?.variant || 'default'}>
                          {statusConfig[appointment.status as keyof typeof statusConfig]?.label || appointment.status}
                        </Badge>
                      </div>

                      {appointment.clients && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{appointment.clients.first_name} {appointment.clients.last_name}</span>
                        </div>
                      )}

                      {appointment.pets && (
                        <div className="flex items-center gap-2 text-sm">
                          <PawPrint className="h-4 w-4 text-muted-foreground" />
                          <span>{appointment.pets.name}</span>
                        </div>
                      )}

                      <div className="text-sm font-medium text-primary">
                        {appointment.appointment_type}
                      </div>

                      {appointment.notes && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {appointment.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
