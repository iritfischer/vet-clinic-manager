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
              <TableHead>שם</TableHead>
              <TableHead>סוג</TableHead>
              <TableHead>גזע</TableHead>
              <TableHead>בעלים</TableHead>
              <TableHead>גיל</TableHead>
              <TableHead>משקל</TableHead>
              <TableHead>סטטוס</TableHead>
              <TableHead className="text-end">פעולות</TableHead>
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
                let ageDisplay: string | null = null;
                if (pet.birth_date) {
                  const birthDate = new Date(pet.birth_date);
                  const now = new Date();
                  const years = Math.floor((now.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                  const months = Math.floor(((now.getTime() - birthDate.getTime()) % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
                  if (years > 0 && months > 0) {
                    ageDisplay = `${years} שנים ו-${months} ח'`;
                  } else if (years > 0) {
                    ageDisplay = `${years} שנים`;
                  } else {
                    ageDisplay = `${months} חודשים`;
                  }
                }

                return (
                  <TableRow key={pet.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <PawPrint className="h-4 w-4 text-muted-foreground" />
                        <span>{pet.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={speciesConfig[pet.species as keyof typeof speciesConfig]?.color || 'bg-muted'}>
                        {speciesConfig[pet.species as keyof typeof speciesConfig]?.label || pet.species}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {pet.breed || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {pet.clients ? (
                        `${pet.clients.first_name} ${pet.clients.last_name}`
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {ageDisplay ? ageDisplay : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {pet.current_weight ? (
                        <div className="flex items-center gap-2">
                          <Weight className="h-4 w-4 text-muted-foreground" />
                          <span>{pet.current_weight} ק"ג</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={pet.status === 'active' ? 'default' : 'outline'}>
                        {pet.status === 'active' ? 'פעיל' : 'לא פעיל'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex gap-2 justify-end">
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
