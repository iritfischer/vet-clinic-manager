import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2 } from 'lucide-react';
import { Vaccination } from '@/hooks/useVaccinations';

interface VaccinationsTableProps {
  items: Vaccination[];
  onEdit: (item: Vaccination) => void;
  onDelete: (id: string) => void;
}

const speciesLabels: Record<string, string> = {
  'dog': 'כלב',
  'cat': 'חתול',
  'other': 'אחר',
  'all': 'כל החיות',
};

export const VaccinationsTable = ({ items, onEdit, onDelete }: VaccinationsTableProps) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>שם החיסון</TableHead>
            <TableHead>סוג חיית מחמד</TableHead>
            <TableHead>מרווח ימים</TableHead>
            <TableHead>תיאור</TableHead>
            <TableHead>סטטוס</TableHead>
            <TableHead className="text-end">פעולות</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                אין חיסונים במערכת
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.label}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {speciesLabels[item.species] || item.species}
                  </Badge>
                </TableCell>
                <TableCell>{item.interval_days} ימים</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {item.description || '-'}
                </TableCell>
                <TableCell>
                  {item.is_active ? (
                    <Badge variant="secondary">פעיל</Badge>
                  ) : (
                    <Badge variant="outline">לא פעיל</Badge>
                  )}
                </TableCell>
                <TableCell className="text-end">
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

