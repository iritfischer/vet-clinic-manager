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
import { AITextarea } from '@/components/ui/ai-textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';
import { TagInput } from '@/components/shared/TagInput';
import { TagCategory } from '@/types/tags';

type Pet = Tables<'pets'>;
type Client = Tables<'clients'>;

// Helper function to get the breed category based on species
const getBreedCategory = (species: string): TagCategory => {
  switch (species) {
    case 'dog':
      return 'breed_dog';
    case 'cat':
      return 'breed_cat';
    default:
      return 'breed_other';
  }
};

const petSchema = z.object({
  name: z.string().min(1, 'יש להזין שם').max(100),
  species: z.string().min(1, 'יש לבחור סוג'),
  breed: z.string().max(100).optional().or(z.literal('')),
  client_id: z.string().min(1, 'יש לבחור בעלים'),
  age_years: z.string().optional().or(z.literal('')),
  age_months: z.string().optional().or(z.literal('')),
  sex: z.string().optional().or(z.literal('')),
  color_markings: z.string().max(500).optional().or(z.literal('')),
  microchip_number: z.string().max(50).optional().or(z.literal('')),
  license_number: z.string().max(50).optional().or(z.literal('')),
  neuter_status: z.string().optional().or(z.literal('')),
  current_weight: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'deceased']),
});

// Helper function to calculate age from birth_date
const calculateAgeFromBirthDate = (birthDate: string | null): { years: string; months: string } => {
  if (!birthDate) return { years: '', months: '' };
  const birth = new Date(birthDate);
  const now = new Date();
  const years = Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const months = Math.floor(((now.getTime() - birth.getTime()) % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
  return { years: years.toString(), months: months.toString() };
};

// Helper function to calculate birth_date from age
const calculateBirthDateFromAge = (years: string, months: string): string | null => {
  const y = parseInt(years) || 0;
  const m = parseInt(months) || 0;
  if (y === 0 && m === 0) return null;
  const now = new Date();
  const birth = new Date(now);
  birth.setFullYear(birth.getFullYear() - y);
  birth.setMonth(birth.getMonth() - m);
  return birth.toISOString().split('T')[0];
};

type PetFormData = z.infer<typeof petSchema>;

interface PetDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  pet?: Pet | null;
  defaultClientId?: string;
}

export const PetDialog = ({ open, onClose, onSave, pet, defaultClientId }: PetDialogProps) => {
  const { clinicId } = useClinic();
  const [clients, setClients] = useState<Client[]>([]);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<PetFormData>({
    resolver: zodResolver(petSchema),
    defaultValues: {
      name: '',
      species: '',
      breed: '',
      client_id: '',
      age_years: '',
      age_months: '',
      sex: '',
      color_markings: '',
      microchip_number: '',
      license_number: '',
      neuter_status: '',
      current_weight: '',
      status: 'active',
    },
  });

  useEffect(() => {
    if (clinicId && open) {
      fetchClients();
    }
  }, [clinicId, open]);

  useEffect(() => {
    if (pet) {
      const age = calculateAgeFromBirthDate(pet.birth_date);
      reset({
        name: pet.name,
        species: pet.species,
        breed: pet.breed || '',
        client_id: pet.client_id,
        age_years: age.years,
        age_months: age.months,
        sex: pet.sex || '',
        color_markings: pet.color_markings || '',
        microchip_number: pet.microchip_number || '',
        license_number: pet.license_number || '',
        neuter_status: pet.neuter_status || '',
        current_weight: pet.current_weight?.toString() || '',
        status: (pet.status as any) || 'active',
      });
    } else {
      reset({
        name: '',
        species: '',
        breed: '',
        client_id: defaultClientId || '',
        age_years: '',
        age_months: '',
        sex: '',
        color_markings: '',
        microchip_number: '',
        license_number: '',
        neuter_status: '',
        current_weight: '',
        status: 'active',
      });
    }
  }, [pet, reset, defaultClientId]);

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

  const onSubmit = (data: PetFormData) => {
    const birthDate = calculateBirthDateFromAge(data.age_years || '', data.age_months || '');
    const cleanedData = {
      name: data.name,
      species: data.species,
      client_id: data.client_id,
      status: data.status,
      breed: data.breed || null,
      birth_date: birthDate,
      sex: data.sex || null,
      color_markings: data.color_markings || null,
      microchip_number: data.microchip_number || null,
      license_number: data.license_number || null,
      neuter_status: data.neuter_status || null,
      current_weight: data.current_weight ? parseFloat(data.current_weight) : null,
    };
    onSave(cleanedData);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">
            {pet ? 'עריכת חיית מחמד' : 'הוספת חיית מחמד חדשה'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs defaultValue="basic" className="w-full" dir="rtl">
            <TabsList className="grid w-full grid-cols-3" dir="rtl">
              <TabsTrigger value="basic">פרטים בסיסיים</TabsTrigger>
              <TabsTrigger value="health">פרטי בריאות</TabsTrigger>
              <TabsTrigger value="identification">זיהוי ורישוי</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">שם *</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    className="text-right"
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client_id">בעלים *</Label>
                  <Select
                    value={watch('client_id') || ''}
                    onValueChange={(value) => setValue('client_id', value, { shouldValidate: true })}
                    dir="rtl"
                  >
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="בחר בעלים" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id} className="text-right">
                          {client.first_name} {client.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.client_id && (
                    <p className="text-sm text-destructive">{errors.client_id.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="species">סוג *</Label>
                  <Select
                    value={watch('species')}
                    onValueChange={(value) => setValue('species', value, { shouldValidate: true })}
                    dir="rtl"
                  >
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="בחר סוג" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="dog" className="text-right">כלב</SelectItem>
                      <SelectItem value="cat" className="text-right">חתול</SelectItem>
                      <SelectItem value="bird" className="text-right">ציפור</SelectItem>
                      <SelectItem value="rabbit" className="text-right">ארנב</SelectItem>
                      <SelectItem value="hamster" className="text-right">אוגר</SelectItem>
                      <SelectItem value="other" className="text-right">אחר</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.species && (
                    <p className="text-sm text-destructive">{errors.species.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="breed">גזע</Label>
                  <TagInput
                    category={getBreedCategory(watch('species'))}
                    value={watch('breed') || ''}
                    onChange={(value) => setValue('breed', value as string)}
                    placeholder="בחר או הקלד גזע"
                    allowCreate={true}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>גיל</Label>
                  <div className="flex gap-4 items-center flex-row-reverse">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">שנים</span>
                      <Input
                        id="age_years"
                        type="number"
                        min="0"
                        max="30"
                        className="w-20 text-center"
                        placeholder="0"
                        {...register('age_years')}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">חודשים</span>
                      <Input
                        id="age_months"
                        type="number"
                        min="0"
                        max="11"
                        className="w-20 text-center"
                        placeholder="0"
                        {...register('age_months')}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sex">מין</Label>
                  <Select
                    value={watch('sex') || 'none'}
                    onValueChange={(value) => setValue('sex', value === 'none' ? '' : value)}
                    dir="rtl"
                  >
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="בחר מין" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="none" className="text-right">לא ידוע</SelectItem>
                      <SelectItem value="male" className="text-right">זכר</SelectItem>
                      <SelectItem value="female" className="text-right">נקבה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color_markings">צבע וסימנים מזהים</Label>
                <AITextarea
                  id="color_markings"
                  value={watch('color_markings') || ''}
                  onValueChange={(value) => setValue('color_markings', value)}
                  aiContext="general"
                  className="text-right"
                  placeholder="תיאור צבע הפרווה, כתמים, סימנים מיוחדים..."
                />
              </div>

              <div className="flex items-center justify-between flex-row-reverse">
                <Label htmlFor="status">סטטוס פעיל</Label>
                <Switch
                  id="status"
                  checked={watch('status') === 'active'}
                  onCheckedChange={(checked) => setValue('status', checked ? 'active' : 'inactive')}
                />
              </div>
            </TabsContent>

            <TabsContent value="health" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="current_weight">משקל נוכחי (ק"ג)</Label>
                <Input
                  id="current_weight"
                  type="number"
                  step="0.1"
                  {...register('current_weight')}
                  className="text-right"
                  placeholder="5.2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="neuter_status">סטטוס עיקור/סירוס</Label>
                <Select
                  value={watch('neuter_status') || 'none'}
                  onValueChange={(value) => setValue('neuter_status', value === 'none' ? '' : value)}
                  dir="rtl"
                >
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="בחר סטטוס" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="none" className="text-right">לא ידוע</SelectItem>
                    <SelectItem value="neutered" className="text-right">מעוקר/מסורס</SelectItem>
                    <SelectItem value="intact" className="text-right">לא מעוקר</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  היסטוריית משקל ופרטי בריאות נוספים יהיו זמינים לאחר השמירה במסך העריכה
                </p>
              </div>
            </TabsContent>

            <TabsContent value="identification" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="microchip_number">מספר שבב</Label>
                <Input
                  id="microchip_number"
                  {...register('microchip_number')}
                  className="text-right"
                  placeholder="982000123456789"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="license_number">מספר רישיון</Label>
                <Input
                  id="license_number"
                  {...register('license_number')}
                  className="text-right"
                  placeholder="מספר רישיון מהרשות המקומית"
                />
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  מומלץ לרשום את מספר השבב ומספר הרישיון לצורך זיהוי ואיתור במקרה של אובדן
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 justify-end pt-4 mt-4 border-t">
            <Button type="submit">
              {pet ? 'עדכן' : 'הוסף חיית מחמד'}
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
