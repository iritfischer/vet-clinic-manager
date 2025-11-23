import { useState } from 'react';
import { Tables } from '@/integrations/supabase/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, PawPrint, Weight } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

type Pet = Tables<'pets'> & {
  clients?: Tables<'clients'> | null;
};

interface PetsTableProps {
  pets: Pet[];
  onEdit: (pet: Pet) => void;
  onDelete: (id: string) => void;
}

const speciesConfig = {
  dog: { label: 'כלב', color: 'bg-primary/10 text-primary' },
  cat: { label: 'חתול', color: 'bg-secondary/10 text-secondary' },
  bird: { label: 'ציפור', color: 'bg-accent/10 text-accent' },
  rabbit: { label: 'ארנב', color: 'bg-muted text-muted-foreground' },
  other: { label: 'אחר', color: 'bg-muted text-muted-foreground' },
};

export const PetsTable = ({ pets, onEdit, onDelete }: PetsTableProps) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <>
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">שם</TableHead>
              <TableHead className="text-right">סוג</TableHead>
              <TableHead className="text-right">גזע</TableHead>
              <TableHead className="text-right">בעלים</TableHead>
              <TableHead className="text-right">גיל</TableHead>
              <TableHead className="text-right">משקל</TableHead>
              <TableHead className="text-right">סטטוס</TableHead>
              <TableHead className="text-left">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  אין חיות מחמד במערכת
                </TableCell>
              </TableRow>
            ) : (
              pets.map((pet) => {
                const age = pet.birth_date
                  ? new Date().getFullYear() - new Date(pet.birth_date).getFullYear()
                  : null;

                return (
                  <TableRow key={pet.id}>
                    <TableCell className="font-medium text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span>{pet.name}</span>
                        <PawPrint className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className={speciesConfig[pet.species as keyof typeof speciesConfig]?.color || 'bg-muted'}>
                        {speciesConfig[pet.species as keyof typeof speciesConfig]?.label || pet.species}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {pet.breed || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {pet.clients ? (
                        `${pet.clients.first_name} ${pet.clients.last_name}`
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {age !== null ? `${age} שנים` : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {pet.current_weight ? (
                        <div className="flex items-center justify-end gap-2">
                          <span>{pet.current_weight} ק"ג</span>
                          <Weight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={pet.status === 'active' ? 'default' : 'outline'}>
                        {pet.status === 'active' ? 'פעיל' : 'לא פעיל'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(pet)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(pet.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">מחיקת חיית מחמד</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              פעולה זו תמחק את חיית המחמד לצמיתות. האם אתה בטוח?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  onDelete(deleteId);
                  setDeleteId(null);
                }
              }}
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
