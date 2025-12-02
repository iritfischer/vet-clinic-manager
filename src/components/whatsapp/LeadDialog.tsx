import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { AITextarea } from '@/components/ui/ai-textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, PawPrint } from 'lucide-react';
import { Lead, LeadFormData, LeadStatus, LeadSource } from '@/types/leads';
import { useState } from 'react';

interface LeadDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: LeadFormData) => void;
  lead?: Lead | null;
  initialPhone?: string;
}

const statusOptions: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'חדש' },
  { value: 'contacted', label: 'יצרנו קשר' },
  { value: 'converted', label: 'הומר ללקוח' },
  { value: 'lost', label: 'אבוד' },
];

const speciesOptions = [
  { value: 'dog', label: 'כלב' },
  { value: 'cat', label: 'חתול' },
  { value: 'bird', label: 'ציפור' },
  { value: 'rabbit', label: 'ארנב' },
  { value: 'hamster', label: 'אוגר' },
  { value: 'other', label: 'אחר' },
];

const sourceOptions: { value: LeadSource; label: string }[] = [
  { value: 'whatsapp', label: 'וואטסאפ' },
  { value: 'phone', label: 'טלפון' },
  { value: 'website', label: 'אתר אינטרנט' },
  { value: 'facebook', label: 'פייסבוק' },
  { value: 'instagram', label: 'אינסטגרם' },
  { value: 'referral', label: 'המלצה' },
  { value: 'walk_in', label: 'הגיע למקום' },
  { value: 'other', label: 'אחר' },
];

export const LeadDialog = ({ open, onClose, onSave, lead, initialPhone }: LeadDialogProps) => {
  const [petSectionOpen, setPetSectionOpen] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<LeadFormData>({
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: initialPhone || '',
      email: '',
      address: '',
      notes: '',
      status: 'new',
      source: undefined,
      pet_name: '',
      pet_species: '',
      pet_breed: '',
      pet_notes: '',
    },
  });

  useEffect(() => {
    if (lead) {
      reset({
        first_name: lead.first_name,
        last_name: lead.last_name || '',
        phone: lead.phone,
        email: lead.email || '',
        address: lead.address || '',
        notes: lead.notes || '',
        status: lead.status as LeadStatus,
        source: (lead.source as LeadSource) || undefined,
        pet_name: lead.pet_name || '',
        pet_species: lead.pet_species || '',
        pet_breed: lead.pet_breed || '',
        pet_notes: lead.pet_notes || '',
      });
      // Open pet section if there's pet data
      if (lead.pet_name || lead.pet_species) {
        setPetSectionOpen(true);
      }
    } else {
      reset({
        first_name: '',
        last_name: '',
        phone: initialPhone || '',
        email: '',
        address: '',
        notes: '',
        status: 'new',
        source: undefined,
        pet_name: '',
        pet_species: '',
        pet_breed: '',
        pet_notes: '',
      });
      setPetSectionOpen(false);
    }
  }, [lead, initialPhone, reset]);

  const onSubmit = (data: LeadFormData) => {
    onSave(data);
    reset();
  };

  const currentStatus = watch('status');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-right">
            {lead ? 'עריכת ליד' : 'הוספת ליד חדש'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" dir="rtl">
          {/* Basic Info */}
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
              <Label htmlFor="last_name">שם משפחה</Label>
              <Input
                id="last_name"
                {...register('last_name')}
                className="text-right"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">טלפון *</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone', { required: 'שדה חובה' })}
                className="text-right"
                dir="ltr"
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                className="text-right"
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">כתובת</Label>
            <Input
              id="address"
              {...register('address')}
              className="text-right"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">סטטוס</Label>
              <Select
                value={currentStatus}
                onValueChange={(value) => setValue('status', value as LeadStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">מקור הגעה</Label>
              <Select
                value={watch('source') || ''}
                onValueChange={(value) => setValue('source', value as LeadSource)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר מקור" />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">הערות</Label>
            <AITextarea
              id="notes"
              value={watch('notes') || ''}
              onValueChange={(value) => setValue('notes', value)}
              aiContext="general"
              className="text-right min-h-[80px]"
            />
          </div>

          {/* Pet Info (Collapsible) */}
          <Collapsible open={petSectionOpen} onOpenChange={setPetSectionOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-between"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${petSectionOpen ? 'rotate-180' : ''}`} />
                <span className="flex items-center gap-2">
                  <PawPrint className="h-4 w-4" />
                  פרטי חיית מחמד (אופציונלי)
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pet_name">שם החיה</Label>
                  <Input
                    id="pet_name"
                    {...register('pet_name')}
                    className="text-right"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pet_species">סוג</Label>
                  <Select
                    value={watch('pet_species') || ''}
                    onValueChange={(value) => setValue('pet_species', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר סוג" />
                    </SelectTrigger>
                    <SelectContent>
                      {speciesOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pet_breed">גזע</Label>
                <Input
                  id="pet_breed"
                  {...register('pet_breed')}
                  className="text-right"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pet_notes">הערות על החיה</Label>
                <AITextarea
                  id="pet_notes"
                  value={watch('pet_notes') || ''}
                  onValueChange={(value) => setValue('pet_notes', value)}
                  aiContext="general"
                  className="text-right min-h-[60px]"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Actions */}
          <div className="flex gap-3 justify-start pt-4">
            <Button type="submit">
              {lead ? 'עדכן' : 'צור ליד'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              ביטול
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
