import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { useClinic } from '@/hooks/useClinic';
import { VaccinationsTable } from '@/components/vaccinations/VaccinationsTable';
import { VaccinationDialog } from '@/components/vaccinations/VaccinationDialog';
import { useVaccinations, Vaccination } from '@/hooks/useVaccinations';
import { TableToolbar } from '@/components/shared/TableToolbar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Vaccinations = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVaccination, setEditingVaccination] = useState<Vaccination | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState<'all' | 'dog' | 'cat' | 'other'>('all');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [vaccinationToDelete, setVaccinationToDelete] = useState<string | null>(null);
  const { clinicId } = useClinic();
  const { vaccinations, loading, fetchVaccinations, createVaccination, updateVaccination, deleteVaccination } = useVaccinations();

  // Filter items based on search and species
  const filteredItems = useMemo(() => {
    return vaccinations.filter(item => {
      const matchesSearch =
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      const matchesSpecies = speciesFilter === 'all' || item.species === speciesFilter || item.species === 'all';

      return matchesSearch && matchesSpecies;
    });
  }, [vaccinations, searchQuery, speciesFilter]);

  const handleSave = async (data: any) => {
    if (!clinicId) return;

    try {
      if (editingVaccination) {
        await updateVaccination(editingVaccination.id, data);
      } else {
        await createVaccination(data);
      }

      setDialogOpen(false);
      setEditingVaccination(null);
      fetchVaccinations();
    } catch (error: any) {
      console.error('Error saving vaccination:', error);
    }
  };

  const handleEdit = (vaccination: Vaccination) => {
    setEditingVaccination(vaccination);
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setVaccinationToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!vaccinationToDelete) return;

    try {
      await deleteVaccination(vaccinationToDelete);
      setDeleteConfirmOpen(false);
      setVaccinationToDelete(null);
      fetchVaccinations();
    } catch (error: any) {
      console.error('Error deleting vaccination:', error);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingVaccination(null);
  };

  const speciesFilterOptions = [
    { value: 'all', label: 'כל הסוגים' },
    { value: 'dog', label: 'כלב' },
    { value: 'cat', label: 'חתול' },
    { value: 'other', label: 'אחר' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">ניהול חיסונים</h1>
            <p className="text-muted-foreground mt-2">
              ניהול מלא של סוגי חיסונים, מרווחי זמן ותזכורות במערכת
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            חיסון חדש
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
              searchPlaceholder="חיפוש לפי שם או תיאור..."
              filters={[
                {
                  key: 'species',
                  label: 'סוג חיית מחמד',
                  options: speciesFilterOptions,
                  value: speciesFilter,
                  onChange: (value) => setSpeciesFilter(value as 'all' | 'dog' | 'cat' | 'other'),
                },
              ]}
              totalCount={vaccinations.length}
              filteredCount={filteredItems.length}
            />
            <VaccinationsTable
              items={filteredItems}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
            />
          </>
        )}

        <VaccinationDialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          onSave={handleSave}
          vaccination={editingVaccination}
        />

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>מחיקת חיסון</AlertDialogTitle>
              <AlertDialogDescription>
                האם אתה בטוח שברצונך למחוק חיסון זה? פעולה זו לא ניתנת לביטול.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setVaccinationToDelete(null)}>ביטול</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                מחיקה
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default Vaccinations;

