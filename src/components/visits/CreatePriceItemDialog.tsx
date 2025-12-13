import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const priceItemSchema = z.object({
  price_without_vat: z.string().min(1, 'מחיר ללא מע״מ הוא שדה חובה'),
  price_with_vat: z.string().min(1, 'מחיר כולל מע״מ הוא שדה חובה'),
});

type PriceItemFormData = z.infer<typeof priceItemSchema>;

interface CreatePriceItemDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (priceItemId: string) => void;
  itemName: string;
  category: string;
  clinicId: string;
}

export const CreatePriceItemDialog = ({
  open,
  onClose,
  onSuccess,
  itemName,
  category,
  clinicId,
}: CreatePriceItemDialogProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const form = useForm<PriceItemFormData>({
    resolver: zodResolver(priceItemSchema),
    defaultValues: {
      price_without_vat: '',
      price_with_vat: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        price_without_vat: '',
        price_with_vat: '',
      });
    }
  }, [open, form]);

  const calculateWithVat = (priceWithoutVat: string) => {
    const price = parseFloat(priceWithoutVat);
    if (!isNaN(price)) {
      const withVat = (price * 1.17).toFixed(2);
      form.setValue('price_with_vat', withVat);
    }
  };

  const handleSubmit = async (data: PriceItemFormData) => {
    if (!clinicId) {
      toast({
        title: 'שגיאה',
        description: 'לא נמצא מזהה מרפאה',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const priceWithoutVat = parseFloat(data.price_without_vat);
      const priceWithVat = parseFloat(data.price_with_vat);

      if (isNaN(priceWithoutVat) || isNaN(priceWithVat)) {
        toast({
          title: 'שגיאה',
          description: 'יש להזין מחירים תקינים',
          variant: 'destructive',
        });
        return;
      }

      const { data: newItem, error } = await supabase
        .from('price_items')
        .insert({
          clinic_id: clinicId,
          name: itemName,
          category: category,
          price_without_vat: priceWithoutVat,
          price_with_vat: priceWithVat,
          is_discountable: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'הצלחה',
        description: 'פריט החיוב נוצר בהצלחה',
      });

      onSuccess(newItem.id);
      onClose();
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message || 'שגיאה ביצירת פריט החיוב',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>יצירת פריט תמחור חדש</DialogTitle>
          <DialogDescription>
            הפריט "{itemName}" לא נמצא במחירון. אנא הזן את המחיר כדי ליצור אותו.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium mb-1">שם הפריט</div>
              <div className="text-sm text-muted-foreground">{itemName}</div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium mb-1">קטגוריה</div>
              <div className="text-sm text-muted-foreground">{category}</div>
            </div>

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

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                ביטול
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'שומר...' : 'צור והוסף'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

