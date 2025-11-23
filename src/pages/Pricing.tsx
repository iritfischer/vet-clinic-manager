import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useClinic } from '@/hooks/useClinic';
import { PriceItemsTable } from '@/components/pricing/PriceItemsTable';
import { PriceItemDialog } from '@/components/pricing/PriceItemDialog';
import { useToast } from '@/hooks/use-toast';

type PriceItem = Tables<'price_items'>;

const Pricing = () => {
  const [items, setItems] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PriceItem | null>(null);
  const { clinicId } = useClinic();
  const { toast } = useToast();

  useEffect(() => {
    if (clinicId) {
      fetchItems();
    }
  }, [clinicId]);

  const fetchItems = async () => {
    if (!clinicId) return;

    try {
      const { data, error } = await supabase
        .from('price_items')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: any) => {
    if (!clinicId) return;

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('price_items')
          .update(data)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast({ title: 'הפריט עודכן בהצלחה' });
      } else {
        const { error } = await supabase
          .from('price_items')
          .insert({ ...data, clinic_id: clinicId });

        if (error) throw error;
        toast({ title: 'הפריט נוסף בהצלחה' });
      }

      setDialogOpen(false);
      setEditingItem(null);
      fetchItems();
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (item: PriceItem) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('price_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'הפריט נמחק בהצלחה' });
      fetchItems();
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">ניהול מחירון</h1>
            <p className="text-muted-foreground mt-2">
              ניהול מלא של פריטים, מחירים וקטגוריות במחירון המרפאה
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            פריט חדש
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <PriceItemsTable
            items={items}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

        <PriceItemDialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          onSave={handleSave}
          item={editingItem}
        />
      </div>
    </DashboardLayout>
  );
};

export default Pricing;
