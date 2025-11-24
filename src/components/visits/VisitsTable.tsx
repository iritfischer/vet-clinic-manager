import { useState } from 'react';
import { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, FileText, Send } from 'lucide-react';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { VisitCard } from './VisitCard';

type Visit = Tables<'visits'> & {
  clients?: Tables<'clients'> | null;
  pets?: Tables<'pets'> | null;
};

interface VisitsTableProps {
  visits: Visit[];
  onEdit: (visit: Visit) => void;
  onDelete: (id: string) => void;
  onGeneratePdf: (visit: Visit) => void;
  onSendWhatsApp: (visit: Visit) => void;
}

const statusConfig = {
  open: { label: 'פתוח', variant: 'default' as const },
  completed: { label: 'הושלם', variant: 'secondary' as const },
  cancelled: { label: 'בוטל', variant: 'destructive' as const },
};

export const VisitsTable = ({ visits, onEdit, onDelete, onGeneratePdf, onSendWhatsApp }: VisitsTableProps) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (visits.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        אין ביקורים במערכת
      </div>
    );
  }

  return (
    <>
      <Accordion type="single" collapsible className="space-y-4">
        {visits.map((visit) => (
          <AccordionItem
            key={visit.id}
            value={visit.id}
            className="rounded-lg border border-border bg-card overflow-hidden"
          >
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-accent/50 transition-colors">
              <div className="flex items-center justify-between w-full text-right gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-sm text-muted-foreground min-w-[120px]">
                    {format(new Date(visit.visit_date), 'dd/MM/yyyy HH:mm', { locale: he })}
                  </div>
                  <Separator orientation="vertical" className="h-6" />
                  <div className="font-medium min-w-[150px]">
                    {visit.clients ? (
                      `${visit.clients.first_name} ${visit.clients.last_name}`
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                  <Separator orientation="vertical" className="h-6" />
                  <div className="min-w-[100px]">
                    {visit.pets ? visit.pets.name : <span className="text-muted-foreground">-</span>}
                  </div>
                  <Separator orientation="vertical" className="h-6" />
                  <Badge variant="outline" className="min-w-[80px] justify-center">
                    {visit.visit_type}
                  </Badge>
                  <Separator orientation="vertical" className="h-6" />
                  <Badge variant={statusConfig[visit.status as keyof typeof statusConfig]?.variant || 'default'}>
                    {statusConfig[visit.status as keyof typeof statusConfig]?.label || visit.status}
                  </Badge>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4">
              <div className="space-y-6 pt-4">
                {/* Actions */}
                <div className="flex gap-2 pb-4 border-b">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(visit)}
                  >
                    <Edit className="h-4 w-4 ml-2" />
                    ערוך
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onGeneratePdf(visit)}
                  >
                    <FileText className="h-4 w-4 ml-2" />
                    צור PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSendWhatsApp(visit)}
                    className="bg-green-50 hover:bg-green-100 border-green-200"
                  >
                    <Send className="h-4 w-4 ml-2 text-green-600" />
                    שלח סיכום
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteId(visit.id)}
                    className="mr-auto text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 ml-2" />
                    מחק
                  </Button>
                </div>

                {/* Visit Details - using shared VisitCard component */}
                <VisitCard visit={visit} />
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">מחיקת ביקור</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              פעולה זו תמחק את הביקור לצמיתות. האם אתה בטוח?
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
