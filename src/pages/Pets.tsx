import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useClinic } from '@/hooks/useClinic';
import { PetsTable } from '@/components/pets/PetsTable';
import { PetDialog } from '@/components/pets/PetDialog';
import { useToast } from '@/hooks/use-toast';

type Pet = Tables<'pets'> & {
  clients?: Tables<'clients'> | null;
};

const Pets = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const { clinicId } = useClinic();
  const { toast } = useToast();

  useEffect(() => {
    if (clinicId) {
      fetchPets();
    }
  }, [clinicId]);

  const fetchPets = async () => {
    if (!clinicId) return;

    try {
      const { data, error } = await supabase
        .from('pets')
        .select(`
          *,
          clients:client_id(*)
        `)
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPets(data || []);
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
      if (editingPet) {
        const { error } = await supabase
          .from('pets')
          .update(data)
          .eq('id', editingPet.id);

        if (error) throw error;
        toast({ title: 'חיית המחמד עודכנה בהצלחה' });
      } else {
        const { error } = await supabase
          .from('pets')
          .insert({ ...data, clinic_id: clinicId });

        if (error) throw error;
        toast({ title: 'חיית המחמד נוספה בהצלחה' });
      }

      setDialogOpen(false);
      setEditingPet(null);
      fetchPets();
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (pet: Pet) => {
    setEditingPet(pet);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'חיית המחמד נמחקה בהצלחה' });
      fetchPets();
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
    setEditingPet(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">ניהול חיות מחמד</h1>
            <p className="text-muted-foreground mt-2">
              ניהול כל חיות המחמד במרפאה
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            חיית מחמד חדשה
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <PetsTable
            pets={pets}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

        <PetDialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          onSave={handleSave}
          pet={editingPet}
        />
      </div>
    </DashboardLayout>
  );
};

export default Pets;
