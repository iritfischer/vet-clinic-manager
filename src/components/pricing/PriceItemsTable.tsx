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
import { Tables } from '@/integrations/supabase/types';

type PriceItem = Tables<'price_items'>;

interface PriceItemsTableProps {
  items: PriceItem[];
  onEdit: (item: PriceItem) => void;
  onDelete: (id: string) => void;
}

const categoryLabels: Record<string, string> = {
  'consultation': 'ייעוץ',
  'surgery': 'ניתוחים',
  'vaccination': 'חיסונים',
  'medication': 'תרופות',
  'treatment': 'טיפולים',
  'diagnostic': 'אבחון',
  'hospitalization': 'אשפוז',
  'other': 'אחר',
};

export const PriceItemsTable = ({ items, onEdit, onDelete }: PriceItemsTableProps) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>קוד</TableHead>
            <TableHead>שם הפריט</TableHead>
            <TableHead>קטגוריה</TableHead>
            <TableHead>מחיר ללא מע״מ</TableHead>
            <TableHead>מחיר כולל מע״מ</TableHead>
            <TableHead>ניתן להנחה</TableHead>
            <TableHead className="text-left">פעולות</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                אין פריטים במחירון
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono">{item.code || '-'}</TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {categoryLabels[item.category] || item.category}
                  </Badge>
                </TableCell>
                <TableCell>₪{item.price_without_vat.toString()}</TableCell>
                <TableCell className="font-semibold">₪{item.price_with_vat.toString()}</TableCell>
                <TableCell>
                  {item.is_discountable ? (
                    <Badge variant="secondary">כן</Badge>
                  ) : (
                    <Badge variant="outline">לא</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 justify-start">
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
