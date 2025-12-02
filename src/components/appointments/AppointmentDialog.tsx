import { useEffect, useState, useMemo } from 'react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';
import { useToast } from '@/hooks/use-toast';
import { ClientDialog, ClientFormData } from '@/components/clients/ClientDialog';
import { PetDialog } from '@/components/pets/PetDialog';
import { Plus, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TagInput } from '@/components/shared/TagInput';

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
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [petDialogOpen, setPetDialogOpen] = useState(false);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  // Get selected client for display
  const selectedClient = useMemo(() =>
    clients.find(c => c.id === selectedClientId),
    [clients, selectedClientId]
  );

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

  const handleSaveClient = async (data: ClientFormData) => {
    if (!clinicId) return;

    try {
      const { data: newClient, error } = await supabase
        .from('clients')
        .insert({ ...data, clinic_id: clinicId })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'הלקוח נוסף בהצלחה' });
      setClientDialogOpen(false);

      // Refresh clients list and auto-select the new client
      await fetchClients();
      if (newClient) {
        setValue('client_id', newClient.id, { shouldValidate: true });
        setSelectedClientId(newClient.id);
      }
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSavePet = async (petData: any) => {
    if (!clinicId || !selectedClientId) return;

    try {
      const { data: newPet, error } = await supabase
        .from('pets')
        .insert({ ...petData, clinic_id: clinicId, client_id: selectedClientId })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'חיית המחמד נוספה בהצלחה' });
      setPetDialogOpen(false);

      // Refresh pets list and auto-select the new pet
      await fetchPets(selectedClientId);
      if (newPet) {
        setValue('pet_id', newPet.id);
      }
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <>
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
            <div className="flex gap-2">
              <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientSearchOpen}
                    className="flex-1 justify-between text-right"
                  >
                    {selectedClient
                      ? `${selectedClient.first_name} ${selectedClient.last_name}`
                      : "חפש לקוח..."}
                    <ChevronsUpDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="חפש לפי שם או טלפון..."
                      value={clientSearchQuery}
                      onValueChange={setClientSearchQuery}
                      className="text-right"
                    />
                    <CommandList>
                      <CommandEmpty>
                        {clients.length === 0
                          ? "אין לקוחות במערכת"
                          : "לא נמצאו לקוחות תואמים"}
                      </CommandEmpty>
                      <CommandGroup>
                        {clients
                          .filter((client) => {
                            if (!clientSearchQuery) return true;
                            const searchLower = clientSearchQuery.toLowerCase();
                            const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
                            const phone = client.phone_primary || '';
                            return fullName.includes(searchLower) || phone.includes(clientSearchQuery);
                          })
                          .map((client) => (
                            <CommandItem
                              key={client.id}
                              value={client.id}
                              onSelect={() => {
                                setValue('client_id', client.id, { shouldValidate: true });
                                setSelectedClientId(client.id);
                                setValue('pet_id', '');
                                setClientSearchOpen(false);
                                setClientSearchQuery('');
                              }}
                              className="flex justify-between"
                            >
                              <div className="flex flex-col text-right">
                                <span>{client.first_name} {client.last_name}</span>
                                <span className="text-xs text-muted-foreground">{client.phone_primary}</span>
                              </div>
                              <Check
                                className={cn(
                                  "h-4 w-4",
                                  selectedClientId === client.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setClientDialogOpen(true)}
                title="הוסף לקוח חדש"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {errors.client_id && (
              <p className="text-sm text-destructive">{errors.client_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pet_id">חיית מחמד</Label>
            <div className="flex gap-2">
              <Select
                value={watch('pet_id') || 'none'}
                onValueChange={(value) => setValue('pet_id', value === 'none' ? '' : value)}
                disabled={!selectedClientId}
              >
                <SelectTrigger className="flex-1 text-right">
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
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setPetDialogOpen(true)}
                disabled={!selectedClientId}
                title="הוסף חיית מחמד חדשה"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="appointment_type">סוג תור *</Label>
            <TagInput
              category="appointment_type"
              value={watch('appointment_type')?.split(',').filter(Boolean) || []}
              onChange={(values) => setValue('appointment_type', Array.isArray(values) ? values.join(',') : values, { shouldValidate: true })}
              placeholder="בחר סוג תור"
              allowCreate={true}
              multiple={true}
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

      <ClientDialog
        open={clientDialogOpen}
        onClose={() => setClientDialogOpen(false)}
        onSave={handleSaveClient}
        showAddPetAfterSave={false}
      />

      <PetDialog
        open={petDialogOpen}
        onClose={() => setPetDialogOpen(false)}
        onSave={handleSavePet}
        defaultClientId={selectedClientId}
      />
    </>
  );
};
