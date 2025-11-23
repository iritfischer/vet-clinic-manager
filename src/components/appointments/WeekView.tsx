import { useState, useRef } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, setHours, setMinutes } from 'date-fns';
import { he } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { User, Edit } from 'lucide-react';

type Appointment = Tables<'appointments'> & {
  clients?: Tables<'clients'> | null;
  pets?: Tables<'pets'> | null;
};

interface WeekViewProps {
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  onCreateAppointment?: (startTime: Date, endTime: Date) => void;
  onNavigateToClient?: (clientId: string) => void;
  onEditAppointment?: (appointment: Appointment) => void;
  onUpdateAppointment?: (appointmentId: string, startTime: Date, endTime: Date) => void;
}

const statusConfig: Record<string, { label: string; variant: string; color: string }> = {
  scheduled: { label: 'מתוזמן', variant: 'default', color: 'bg-blue-500' },
  confirmed: { label: 'מאושר', variant: 'default', color: 'bg-green-500' },
  cancelled: { label: 'בוטל', variant: 'destructive', color: 'bg-red-500' },
  completed: { label: 'הושלם', variant: 'secondary', color: 'bg-gray-500' },
  no_show: { label: 'לא הגיע', variant: 'outline', color: 'bg-yellow-600' },
};

const appointmentTypeColors: Record<string, string> = {
  'חיסון': 'bg-purple-500',
  'ניתוח': 'bg-red-600',
  'בדיקה': 'bg-blue-500',
  'טיפול': 'bg-green-600',
  'ייעוץ': 'bg-yellow-500',
  'חירום': 'bg-orange-600',
  'מעקב': 'bg-teal-500',
};

const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6 AM to 8 PM

export function WeekView({ 
  appointments, 
  onAppointmentClick, 
  onCreateAppointment,
  onNavigateToClient,
  onEditAppointment,
  onUpdateAppointment
}: WeekViewProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    startDay: Date | null;
    startHour: number | null;
    startMinute: number;
    endHour: number | null;
    endMinute: number;
  }>({
    isDragging: false,
    startDay: null,
    startHour: null,
    startMinute: 0,
    endHour: null,
    endMinute: 0,
  });
  
  const [draggingAppointment, setDraggingAppointment] = useState<{
    appointment: Appointment | null;
    offsetY: number;
  }>({
    appointment: null,
    offsetY: 0,
  });
  
  const [resizingAppointment, setResizingAppointment] = useState<{
    appointment: Appointment | null;
    edge: 'top' | 'bottom' | null;
  }>({
    appointment: null,
    edge: null,
  });
  
  const gridRef = useRef<HTMLDivElement>(null);

  const weekStart = startOfWeek(currentWeek, { locale: he, weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handlePreviousWeek = () => {
    setCurrentWeek(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(prev => addWeeks(prev, 1));
  };

  const handleToday = () => {
    setCurrentWeek(new Date());
  };

  const getAppointmentsForDayAndHour = (day: Date, hour: number) => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.start_time);
      const aptHour = aptDate.getHours();
      return isSameDay(aptDate, day) && aptHour === hour;
    });
  };

  const calculateAppointmentPosition = (appointment: Appointment) => {
    const startTime = new Date(appointment.start_time);
    const endTime = new Date(appointment.end_time);
    const startMinutes = startTime.getMinutes();
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // duration in minutes
    
    const topPercent = (startMinutes / 60) * 100;
    const heightPercent = (duration / 60) * 100;
    
    return { top: `${topPercent}%`, height: `${heightPercent}%` };
  };

  const handleMouseDown = (day: Date, hour: number, e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-appointment]')) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minute = Math.round((y / rect.height) * 60);
    
    setDragState({
      isDragging: true,
      startDay: day,
      startHour: hour,
      startMinute: minute,
      endHour: hour,
      endMinute: minute,
    });
  };

  const handleMouseMove = (day: Date, hour: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragState.isDragging || !isSameDay(day, dragState.startDay!)) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minute = Math.round((y / rect.height) * 60);
    
    setDragState(prev => ({
      ...prev,
      endHour: hour,
      endMinute: minute,
    }));
  };

  const handleMouseUp = () => {
    if (!dragState.isDragging || !dragState.startDay || dragState.startHour === null) return;
    
    const startHour = dragState.startHour;
    const endHour = dragState.endHour || dragState.startHour;
    const startMinute = dragState.startMinute;
    const endMinute = dragState.endMinute;
    
    let startTime = setMinutes(setHours(dragState.startDay, startHour), startMinute);
    let endTime = setMinutes(setHours(dragState.startDay, endHour), endMinute);
    
    // If dragging backwards, swap times
    if (endTime < startTime) {
      [startTime, endTime] = [endTime, startTime];
    }
    
    // Minimum 15 minutes appointment
    if ((endTime.getTime() - startTime.getTime()) < 15 * 60 * 1000) {
      endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
    }
    
    if (onCreateAppointment) {
      onCreateAppointment(startTime, endTime);
    }
    
    setDragState({
      isDragging: false,
      startDay: null,
      startHour: null,
      startMinute: 0,
      endHour: null,
      endMinute: 0,
    });
  };

  const getDragPreviewPosition = (day: Date, hour: number) => {
    if (!dragState.isDragging || !dragState.startDay || !isSameDay(day, dragState.startDay)) {
      return null;
    }
    
    const startHour = dragState.startHour!;
    const endHour = dragState.endHour || dragState.startHour!;
    const startMinute = dragState.startMinute;
    const endMinute = dragState.endMinute;
    
    if (hour < Math.min(startHour, endHour) || hour > Math.max(startHour, endHour)) {
      return null;
    }
    
    let topPercent = 0;
    let heightPercent = 0;
    
    if (startHour === endHour && hour === startHour) {
      topPercent = (Math.min(startMinute, endMinute) / 60) * 100;
      heightPercent = (Math.abs(endMinute - startMinute) / 60) * 100;
    } else if (hour === Math.min(startHour, endHour)) {
      const minute = startHour < endHour ? startMinute : endMinute;
      topPercent = (minute / 60) * 100;
      heightPercent = ((60 - minute) / 60) * 100;
    } else if (hour === Math.max(startHour, endHour)) {
      const minute = startHour > endHour ? startMinute : endMinute;
      heightPercent = (minute / 60) * 100;
    } else {
      heightPercent = 100;
    }
    
    return { top: `${topPercent}%`, height: `${Math.max(heightPercent, 5)}%` };
  };

  const handleAppointmentDragStart = (appointment: Appointment, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    setDraggingAppointment({ appointment, offsetY });
    e.stopPropagation();
  };

  const handleAppointmentDragMove = (day: Date, hour: number, e: React.MouseEvent) => {
    if (!draggingAppointment.appointment) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top - draggingAppointment.offsetY;
    const minute = Math.round((y / rect.height) * 60);
    
    const startTime = new Date(draggingAppointment.appointment.start_time);
    const endTime = new Date(draggingAppointment.appointment.end_time);
    const duration = endTime.getTime() - startTime.getTime();
    
    const newStartTime = setMinutes(setHours(day, hour), Math.max(0, Math.min(59, minute)));
    const newEndTime = new Date(newStartTime.getTime() + duration);
    
    if (onUpdateAppointment && isSameDay(day, weekDays.find(d => isSameDay(d, day)) || day)) {
      onUpdateAppointment(draggingAppointment.appointment.id, newStartTime, newEndTime);
    }
  };

  const handleAppointmentDragEnd = () => {
    setDraggingAppointment({ appointment: null, offsetY: 0 });
  };

  const handleResizeStart = (appointment: Appointment, edge: 'top' | 'bottom', e: React.MouseEvent) => {
    e.stopPropagation();
    setResizingAppointment({ appointment, edge });
  };

  const handleResizeMove = (day: Date, hour: number, e: React.MouseEvent) => {
    if (!resizingAppointment.appointment || !resizingAppointment.edge) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minute = Math.round((y / rect.height) * 60);
    
    const startTime = new Date(resizingAppointment.appointment.start_time);
    const endTime = new Date(resizingAppointment.appointment.end_time);
    
    let newStartTime = startTime;
    let newEndTime = endTime;
    
    if (resizingAppointment.edge === 'top') {
      newStartTime = setMinutes(setHours(day, hour), Math.max(0, Math.min(59, minute)));
      if (newStartTime >= endTime) {
        newStartTime = new Date(endTime.getTime() - 15 * 60 * 1000);
      }
    } else {
      newEndTime = setMinutes(setHours(day, hour), Math.max(0, Math.min(59, minute)));
      if (newEndTime <= startTime) {
        newEndTime = new Date(startTime.getTime() + 15 * 60 * 1000);
      }
    }
    
    if (onUpdateAppointment) {
      onUpdateAppointment(resizingAppointment.appointment.id, newStartTime, newEndTime);
    }
  };

  const handleResizeEnd = () => {
    setResizingAppointment({ appointment: null, edge: null });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            היום
          </Button>
        </div>
        <h2 className="text-lg font-semibold">
          {format(weekStart, 'd MMMM', { locale: he })} - {format(addDays(weekStart, 6), 'd MMMM yyyy', { locale: he })}
        </h2>
      </div>

      {/* Color Legend */}
      <div className="bg-muted/50 p-3 rounded-lg space-y-2" dir="rtl">
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <span className="font-medium">מקרא צבעים:</span>
          {Object.entries(appointmentTypeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className={cn("w-4 h-4 rounded", color)} />
              <span>{type}</span>
            </div>
          ))}
        </div>
        <div className="text-xs text-muted-foreground border-t border-border pt-2">
          💡 <strong>טיפים:</strong> גרור תור להזזה • גרור קצוות תור לשינוי אורך • לחץ ימני לאפשרויות
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card" dir="rtl">
        <div className="grid grid-cols-8 border-b bg-muted/50">
          <div className="p-2 text-sm font-medium border-l"></div>
          {weekDays.map((day, i) => (
            <div
              key={i}
              className={cn(
                "p-2 text-center text-sm font-medium border-l",
                isSameDay(day, new Date()) && "bg-primary/10"
              )}
            >
              <div>{format(day, 'EEEE', { locale: he })}</div>
              <div className="text-2xl">{format(day, 'd')}</div>
            </div>
          ))}
        </div>

        <div 
          className="overflow-y-auto" 
          style={{ maxHeight: '600px' }}
          ref={gridRef}
          onMouseUp={() => {
            handleMouseUp();
            handleAppointmentDragEnd();
            handleResizeEnd();
          }}
          onMouseLeave={() => {
            handleMouseUp();
            handleAppointmentDragEnd();
            handleResizeEnd();
          }}
        >
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b" style={{ height: '80px' }}>
              <div className="p-2 text-sm text-muted-foreground border-l flex items-start justify-center">
                {hour}:00
              </div>
              {weekDays.map((day, dayIndex) => {
                const dayAppointments = getAppointmentsForDayAndHour(day, hour);
                const dragPreview = getDragPreviewPosition(day, hour);
                
                return (
                  <div
                    key={dayIndex}
                    className="border-l relative hover:bg-muted/30 transition-colors cursor-crosshair"
                    onMouseDown={(e) => handleMouseDown(day, hour, e)}
                    onMouseMove={(e) => {
                      handleMouseMove(day, hour, e);
                      if (draggingAppointment.appointment) {
                        handleAppointmentDragMove(day, hour, e);
                      }
                      if (resizingAppointment.appointment) {
                        handleResizeMove(day, hour, e);
                      }
                    }}
                  >
                    {dragPreview && (
                      <div
                        className="absolute right-0 left-0 mx-0.5 rounded bg-primary/30 border-2 border-primary border-dashed"
                        style={dragPreview}
                      />
                    )}
                    
                    {dayAppointments.map((apt) => {
                      const position = calculateAppointmentPosition(apt);
                      const typeColor = appointmentTypeColors[apt.appointment_type] || 'bg-gray-600';
                      const isDragging = draggingAppointment.appointment?.id === apt.id;
                      const isResizing = resizingAppointment.appointment?.id === apt.id;
                      
                      return (
                        <ContextMenu key={apt.id}>
                          <ContextMenuTrigger>
                            <div
                              data-appointment
                              className={cn(
                                "absolute right-0 left-0 mx-0.5 rounded p-1 text-xs overflow-hidden group",
                                "border-2 border-white/30 transition-all",
                                typeColor,
                                "text-white cursor-move select-none",
                                isDragging && "opacity-50 scale-105",
                                isResizing && "ring-2 ring-primary",
                                !isDragging && !isResizing && "hover:opacity-90 hover:scale-[1.02] hover:shadow-lg"
                              )}
                              style={position}
                              onMouseDown={(e) => handleAppointmentDragStart(apt, e)}
                              title={`${apt.clients?.first_name || ''} ${apt.clients?.last_name || ''} - ${apt.pets?.name || ''}`}
                            >
                              {/* Resize handle top */}
                              <div
                                className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize opacity-0 group-hover:opacity-100 hover:bg-white/50 transition-opacity"
                                onMouseDown={(e) => handleResizeStart(apt, 'top', e)}
                              />
                              
                              <div className="font-semibold truncate">
                                {format(new Date(apt.start_time), 'HH:mm')}
                              </div>
                              <div className="truncate">
                                {apt.clients?.first_name} {apt.clients?.last_name}
                              </div>
                              {apt.pets?.name && (
                                <div className="truncate text-xs opacity-90">
                                  {apt.pets.name}
                                </div>
                              )}
                              <div className="truncate text-xs opacity-75 font-semibold">
                                {apt.appointment_type}
                              </div>
                              
                              {/* Resize handle bottom */}
                              <div
                                className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize opacity-0 group-hover:opacity-100 hover:bg-white/50 transition-opacity"
                                onMouseDown={(e) => handleResizeStart(apt, 'bottom', e)}
                              />
                            </div>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem 
                              onClick={() => onEditAppointment?.(apt)}
                              className="cursor-pointer"
                            >
                              <Edit className="ml-2 h-4 w-4" />
                              ערוך תור
                            </ContextMenuItem>
                            {apt.client_id && (
                              <ContextMenuItem 
                                onClick={() => onNavigateToClient?.(apt.client_id!)}
                                className="cursor-pointer"
                              >
                                <User className="ml-2 h-4 w-4" />
                                כרטיס לקוח
                              </ContextMenuItem>
                            )}
                          </ContextMenuContent>
                        </ContextMenu>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
