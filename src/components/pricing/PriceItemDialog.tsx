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
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tables } from '@/integrations/supabase/types';
import { TagInput } from '@/components/shared/TagInput';

type PriceItem = Tables<'price_items'>;

const priceItemSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, 'שם הפריט הוא שדה חובה'),
  category: z.string().min(1, 'קטגוריה היא שדה חובה'),
  price_without_vat: z.string().min(1, 'מחיר ללא מע״מ הוא שדה חובה'),
  price_with_vat: z.string().min(1, 'מחיר כולל מע״מ הוא שדה חובה'),
  is_discountable: z.boolean().default(true),
});

type PriceItemFormData = z.infer<typeof priceItemSchema>;

interface PriceItemDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  item: PriceItem | null;
}

export const PriceItemDialog = ({ open, onClose, onSave, item }: PriceItemDialogProps) => {
  const form = useForm<PriceItemFormData>({
    resolver: zodResolver(priceItemSchema),
    defaultValues: {
      code: '',
      name: '',
      category: '',
      price_without_vat: '',
      price_with_vat: '',
      is_discountable: true,
    },
  });

  useEffect(() => {
    if (item) {
      form.reset({
        code: item.code || '',
        name: item.name,
        category: item.category,
        price_without_vat: item.price_without_vat.toString(),
        price_with_vat: item.price_with_vat.toString(),
        is_discountable: item.is_discountable ?? true,
      });
    } else {
      form.reset({
        code: '',
        name: '',
        category: '',
        price_without_vat: '',
        price_with_vat: '',
        is_discountable: true,
      });
    }
  }, [item, form]);

  const handleSubmit = (data: PriceItemFormData) => {
    onSave({
      code: data.code || null,
      name: data.name,
      category: data.category,
      price_without_vat: parseFloat(data.price_without_vat),
      price_with_vat: parseFloat(data.price_with_vat),
      is_discountable: data.is_discountable,
    });
  };

  const calculateWithVat = (priceWithoutVat: string) => {
    const price = parseFloat(priceWithoutVat);
    if (!isNaN(price)) {
      const withVat = (price * 1.17).toFixed(2);
      form.setValue('price_with_vat', withVat);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? 'עריכת פריט' : 'פריט חדש'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>קוד פריט (אופציונלי)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="לדוגמה: CONS-001" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>שם הפריט</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="לדוגמה: בדיקה כללית" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>קטגוריה</FormLabel>
                  <FormControl>
                    <TagInput
                      category="price_category"
                      value={field.value?.split(',').filter(Boolean) || []}
                      onChange={(values) => field.onChange(Array.isArray(values) ? values.join(',') : values)}
                      placeholder="בחר קטגוריה"
                      allowCreate={true}
                      multiple={true}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_discountable"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">ניתן להנחה</FormLabel>
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
