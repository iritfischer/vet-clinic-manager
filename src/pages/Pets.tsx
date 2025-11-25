import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useClinic } from '@/hooks/useClinic';
import { PetsTable } from '@/components/pets/PetsTable';
import { PetDialog } from '@/components/pets/PetDialog';
import { useToast } from '@/hooks/use-toast';
import { TableToolbar } from '@/components/shared/TableToolbar';

type Pet = Tables<'pets'> & {
  clients?: Tables<'clients'> | null;
};

const Pets = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('all');
  const { clinicId } = useClinic();
  const { toast } = useToast();

  // Filter pets based on search and species
  const filteredPets = useMemo(() => {
    return pets.filter(pet => {
      const ownerName = pet.clients ? `${pet.clients.first_name} ${pet.clients.last_name}`.toLowerCase() : '';
      const matchesSearch =
        pet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ownerName.includes(searchQuery.toLowerCase()) ||
        pet.breed?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSpecies = speciesFilter === 'all' || pet.species === speciesFilter;

      return matchesSearch && matchesSpecies;
    });
  }, [pets, searchQuery, speciesFilter]);

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
          <>
            <TableToolbar
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="חיפוש לפי שם, גזע או בעלים..."
              filters={[
                {
                  key: 'species',
                  label: 'סוג',
                  options: [
                    { value: 'all', label: 'כל הסוגים' },
                    { value: 'dog', label: 'כלב' },
                    { value: 'cat', label: 'חתול' },
                    { value: 'bird', label: 'ציפור' },
                    { value: 'rabbit', label: 'ארנב' },
                    { value: 'other', label: 'אחר' },
                  ],
                  value: speciesFilter,
                  onChange: setSpeciesFilter,
                },
              ]}
              totalCount={pets.length}
              filteredCount={filteredPets.length}
            />
            <PetsTable
              pets={filteredPets}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </>
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
