import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Vaccination } from '@/hooks/useVaccinations';

const vaccinationSchema = z.object({
  name: z.string().min(1, 'שם החיסון הוא שדה חובה'),
  label: z.string().min(1, 'תווית עברית היא שדה חובה'),
  species: z.enum(['dog', 'cat', 'other', 'all'], {
    required_error: 'יש לבחור סוג חיית מחמד',
  }),
  interval_days: z.string().min(1, 'מרווח ימים הוא שדה חובה'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.string().optional(),
  price_without_vat: z.string().optional(),
  price_with_vat: z.string().optional(),
});

type VaccinationFormData = z.infer<typeof vaccinationSchema>;

interface VaccinationDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  vaccination: Vaccination | null;
}

export const VaccinationDialog = ({ open, onClose, onSave, vaccination }: VaccinationDialogProps) => {
  const form = useForm<VaccinationFormData>({
    resolver: zodResolver(vaccinationSchema),
    defaultValues: {
      name: '',
      label: '',
      species: 'dog',
      interval_days: '365',
      description: '',
      is_active: true,
      sort_order: '0',
      price_without_vat: '',
      price_with_vat: '',
    },
  });

  useEffect(() => {
    if (vaccination) {
      form.reset({
        name: vaccination.name,
        label: vaccination.label,
        species: vaccination.species as 'dog' | 'cat' | 'other' | 'all',
        interval_days: vaccination.interval_days.toString(),
        description: vaccination.description || '',
        is_active: vaccination.is_active ?? true,
        sort_order: vaccination.sort_order?.toString() || '0',
        price_without_vat: vaccination.price_without_vat?.toString() || '',
        price_with_vat: vaccination.price_with_vat?.toString() || '',
      });
    } else {
      form.reset({
        name: '',
        label: '',
        species: 'dog',
        interval_days: '365',
        description: '',
        is_active: true,
        sort_order: '0',
        price_without_vat: '',
        price_with_vat: '',
      });
    }
  }, [vaccination, form]);

  const handleSubmit = (data: VaccinationFormData) => {
    onSave({
      name: data.name,
      label: data.label,
      species: data.species,
      interval_days: parseInt(data.interval_days, 10),
      description: data.description || null,
      is_active: data.is_active,
      sort_order: parseInt(data.sort_order || '0', 10),
      price_without_vat: data.price_without_vat ? parseFloat(data.price_without_vat) : null,
      price_with_vat: data.price_with_vat ? parseFloat(data.price_with_vat) : null,
    });
  };

  const calculateWithVat = (priceWithoutVat: string) => {
    const price = parseFloat(priceWithoutVat);
    if (!isNaN(price)) {
      const withVat = (price * 1.17).toFixed(2);
      form.setValue('price_with_vat', withVat);
    } else {
      form.setValue('price_with_vat', '');
    }
  };

  const calculateWithoutVat = (priceWithVat: string) => {
    const price = parseFloat(priceWithVat);
    if (!isNaN(price)) {
      const withoutVat = (price / 1.17).toFixed(2);
      form.setValue('price_without_vat', withoutVat);
    } else {
      form.setValue('price_without_vat', '');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{vaccination ? 'עריכת חיסון' : 'חיסון חדש'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>שם החיסון (אנגלית)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="לדוגמה: rabies" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>תווית עברית</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="לדוגמה: כלבת" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="species"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>סוג חיית מחמד</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר סוג חיית מחמד" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="dog">כלב</SelectItem>
                      <SelectItem value="cat">חתול</SelectItem>
                      <SelectItem value="other">אחר</SelectItem>
                      <SelectItem value="all">כל החיות</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="interval_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>מרווח ימים בין חיסונים</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min="1" placeholder="365" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>תיאור (אופציונלי)</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="תיאור נוסף על החיסון..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sort_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>סדר הצגה (אופציונלי)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min="0" placeholder="0" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-semibold">תמחור (אופציונלי)</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price_without_vat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>מחיר ללא מע״מ</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          onChange={(e) => {
                            field.onChange(e);
                            calculateWithVat(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price_with_vat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>מחיר כולל מע״מ</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          onChange={(e) => {
                            field.onChange(e);
                            calculateWithoutVat(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                אם מוגדר תמחור, החיסון יתווסף אוטומטית לפריטי חיוב בעת הוספתו לביקור
              </p>
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">פעיל</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={onClose}>
                ביטול
              </Button>
              <Button type="submit">שמירה</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

