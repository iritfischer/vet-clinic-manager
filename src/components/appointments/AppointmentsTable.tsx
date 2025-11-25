import { useState } from 'react';
import { Tables } from '@/integrations/supabase/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Calendar, Clock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

type Appointment = Tables<'appointments'> & {
  clients?: Tables<'clients'> | null;
  pets?: Tables<'pets'> | null;
};

interface AppointmentsTableProps {
  appointments: Appointment[];
  onEdit: (appointment: Appointment) => void;
  onDelete: (id: string) => void;
}

const statusConfig = {
  scheduled: { label: 'מתוזמן', variant: 'default' as const },
  confirmed: { label: 'אושר', variant: 'secondary' as const },
  completed: { label: 'הושלם', variant: 'outline' as const },
  cancelled: { label: 'בוטל', variant: 'destructive' as const },
  no_show: { label: 'לא הגיע', variant: 'destructive' as const },
};

export const AppointmentsTable = ({ appointments, onEdit, onDelete }: AppointmentsTableProps) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <>
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>תאריך ושעה</TableHead>
              <TableHead>לקוח</TableHead>
              <TableHead>חיית מחמד</TableHead>
              <TableHead>סוג תור</TableHead>
              <TableHead>סטטוס</TableHead>
              <TableHead>הערות</TableHead>
              <TableHead className="text-end">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  אין תורים במערכת
                </TableCell>
              </TableRow>
            ) : (
              appointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{format(new Date(appointment.start_time), 'dd/MM/yyyy', { locale: he })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {format(new Date(appointment.start_time), 'HH:mm')} - {format(new Date(appointment.end_time), 'HH:mm')}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {appointment.clients ? (
                      `${appointment.clients.first_name} ${appointment.clients.last_name}`
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {appointment.pets ? appointment.pets.name : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>{appointment.appointment_type}</TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[appointment.status as keyof typeof statusConfig]?.variant || 'default'}>
                      {statusConfig[appointment.status as keyof typeof statusConfig]?.label || appointment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {appointment.notes || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(appointment)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(appointment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">מחיקת תור</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              פעולה זו תמחק את התור לצמיתות. האם אתה בטוח?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  onDelete(deleteId);
                  setDeleteId(null);
                }
              }}
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
