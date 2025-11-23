import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Tables } from '@/integrations/supabase/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';

type Appointment = Tables<'appointments'>;
type Client = Tables<'clients'>;
type Pet = Tables<'pets'>;

const appointmentSchema = z.object({
  client_id: z.string().min(1, 'יש לבחור לקוח'),
  pet_id: z.string().optional().or(z.literal('')),
  appointment_type: z.string().min(1, 'יש לבחור סוג תור').max(100),
  start_time: z.string().min(1, 'יש להזין תאריך ושעת התחלה'),
  end_time: z.string().min(1, 'יש להזין תאריך ושעת סיום'),
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']),
  notes: z.string().max(1000).optional().or(z.literal('')),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AppointmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: AppointmentFormData) => void;
  appointment?: Appointment | null;
}

export const AppointmentDialog = ({ open, onClose, onSave, appointment }: AppointmentDialogProps) => {
  const { clinicId } = useClinic();
  const [clients, setClients] = useState<Client[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      client_id: '',
      pet_id: '',
      appointment_type: '',
      start_time: '',
      end_time: '',
      status: 'scheduled',
      notes: '',
    },
  });

  useEffect(() => {
    if (clinicId && open) {
      fetchClients();
    }
  }, [clinicId, open]);

  useEffect(() => {
    if (selectedClientId) {
      fetchPets(selectedClientId);
    } else {
      setPets([]);
    }
  }, [selectedClientId]);

  useEffect(() => {
    if (appointment) {
      const startDate = new Date(appointment.start_time);
      const endDate = new Date(appointment.end_time);
      
      reset({
        client_id: appointment.client_id || '',
        pet_id: appointment.pet_id || '',
        appointment_type: appointment.appointment_type,
        start_time: startDate.toISOString().slice(0, 16),
        end_time: endDate.toISOString().slice(0, 16),
        status: (appointment.status as any) || 'scheduled',
        notes: appointment.notes || '',
      });
      
      if (appointment.client_id) {
        setSelectedClientId(appointment.client_id);
      }
    } else {
      reset({
        client_id: '',
        pet_id: '',
        appointment_type: '',
        start_time: '',
        end_time: '',
        status: 'scheduled',
        notes: '',
      });
      setSelectedClientId('');
    }
  }, [appointment, reset]);

  const fetchClients = async () => {
    if (!clinicId) return;

    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('status', 'active')
      .order('first_name');

    if (data) setClients(data);
  };

  const fetchPets = async (clientId: string) => {
    if (!clinicId) return;

    const { data } = await supabase
      .from('pets')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('client_id', clientId)
      .eq('status', 'active')
      .order('name');

    if (data) setPets(data);
  };

  const onSubmit = (data: AppointmentFormData) => {
    onSave(data);
    reset();
    setSelectedClientId('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-right">
            {appointment ? 'עריכת תור' : 'הוספת תור חדש'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client_id">לקוח *</Label>
            <Select
              value={watch('client_id') || ''}
              onValueChange={(value) => {
                setValue('client_id', value, { shouldValidate: true });
                setSelectedClientId(value);
                setValue('pet_id', '');
              }}
            >
              <SelectTrigger className="text-right">
                <SelectValue placeholder="בחר לקוח" />
              </SelectTrigger>
              <SelectContent>
                {clients.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    אין לקוחות במערכת. אנא הוסף לקוח תחילה.
                  </div>
                ) : (
                  clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.first_name} {client.last_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.client_id && (
              <p className="text-sm text-destructive">{errors.client_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pet_id">חיית מחמד</Label>
            <Select
              value={watch('pet_id') || 'none'}
              onValueChange={(value) => setValue('pet_id', value === 'none' ? '' : value)}
              disabled={!selectedClientId}
            >
              <SelectTrigger className="text-right">
                <SelectValue placeholder="בחר חיית מחמד (אופציונלי)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא חיית מחמד</SelectItem>
                {pets.map((pet) => (
                  <SelectItem key={pet.id} value={pet.id}>
                    {pet.name} ({pet.species})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="appointment_type">סוג תור *</Label>
            <Input
              id="appointment_type"
              {...register('appointment_type')}
              placeholder="בדיקה שגרתית / חיסון / ניתוח וכו'"
              className="text-right"
            />
            {errors.appointment_type && (
              <p className="text-sm text-destructive">{errors.appointment_type.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">תאריך ושעת התחלה *</Label>
              <Input
                id="start_time"
                type="datetime-local"
                {...register('start_time')}
              />
              {errors.start_time && (
                <p className="text-sm text-destructive">{errors.start_time.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">תאריך ושעת סיום *</Label>
              <Input
                id="end_time"
                type="datetime-local"
                {...register('end_time')}
              />
              {errors.end_time && (
                <p className="text-sm text-destructive">{errors.end_time.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">סטטוס</Label>
            <Select
              value={watch('status')}
              onValueChange={(value) => setValue('status', value as any)}
            >
              <SelectTrigger className="text-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">מתוזמן</SelectItem>
                <SelectItem value="confirmed">אושר</SelectItem>
                <SelectItem value="completed">הושלם</SelectItem>
                <SelectItem value="cancelled">בוטל</SelectItem>
                <SelectItem value="no_show">לא הגיע</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">הערות</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              className="text-right min-h-[100px]"
              placeholder="הערות נוספות על התור..."
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes.message}</p>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              ביטול
            </Button>
            <Button type="submit">
              {appointment ? 'עדכן' : 'הוסף תור'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
