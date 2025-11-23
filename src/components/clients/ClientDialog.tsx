import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { Switch } from '@/components/ui/switch';

type Client = Tables<'clients'>;

interface ClientDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: ClientFormData) => void;
  client?: Client | null;
}

export interface ClientFormData {
  first_name: string;
  last_name: string;
  phone_primary: string;
  phone_secondary?: string;
  email?: string;
  address?: string;
  notes?: string;
  whatsapp_opt_in: boolean;
  status: 'active' | 'inactive';
}

export const ClientDialog = ({ open, onClose, onSave, client }: ClientDialogProps) => {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ClientFormData>({
    defaultValues: {
      first_name: '',
      last_name: '',
      phone_primary: '',
      phone_secondary: '',
      email: '',
      address: '',
      notes: '',
      whatsapp_opt_in: false,
      status: 'active',
    },
  });

  useEffect(() => {
    if (client) {
      reset({
        first_name: client.first_name,
        last_name: client.last_name,
        phone_primary: client.phone_primary,
        phone_secondary: client.phone_secondary || '',
        email: client.email || '',
        address: client.address || '',
        notes: client.notes || '',
        whatsapp_opt_in: client.whatsapp_opt_in || false,
        status: (client.status as 'active' | 'inactive') || 'active',
      });
    } else {
      reset({
        first_name: '',
        last_name: '',
        phone_primary: '',
        phone_secondary: '',
        email: '',
        address: '',
        notes: '',
        whatsapp_opt_in: false,
        status: 'active',
      });
    }
  }, [client, reset]);

  const onSubmit = (data: ClientFormData) => {
    onSave(data);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-right">
            {client ? 'עריכת לקוח' : 'הוספת לקוח חדש'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">שם פרטי *</Label>
              <Input
                id="first_name"
                {...register('first_name', { required: 'שדה חובה' })}
                className="text-right"
              />
              {errors.first_name && (
                <p className="text-sm text-destructive">{errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">שם משפחה *</Label>
              <Input
                id="last_name"
                {...register('last_name', { required: 'שדה חובה' })}
                className="text-right"
              />
              {errors.last_name && (
                <p className="text-sm text-destructive">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone_primary">טלפון ראשי *</Label>
              <Input
                id="phone_primary"
                type="tel"
                {...register('phone_primary', { required: 'שדה חובה' })}
                className="text-right"
              />
              {errors.phone_primary && (
                <p className="text-sm text-destructive">{errors.phone_primary.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_secondary">טלפון משני</Label>
              <Input
                id="phone_secondary"
                type="tel"
                {...register('phone_secondary')}
                className="text-right"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">אימייל</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              className="text-right"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">כתובת</Label>
            <Input
              id="address"
              {...register('address')}
              className="text-right"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">הערות</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              className="text-right min-h-[100px]"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="whatsapp_opt_in">הסכמה לקבלת הודעות WhatsApp</Label>
            <Switch
              id="whatsapp_opt_in"
              checked={watch('whatsapp_opt_in')}
              onCheckedChange={(checked) => setValue('whatsapp_opt_in', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="status">סטטוס פעיל</Label>
            <Switch
              id="status"
              checked={watch('status') === 'active'}
              onCheckedChange={(checked) => setValue('status', checked ? 'active' : 'inactive')}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              ביטול
            </Button>
            <Button type="submit">
              {client ? 'עדכן' : 'הוסף לקוח'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
