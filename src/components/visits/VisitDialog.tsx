import { Tables } from '@/integrations/supabase/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VisitCard } from './VisitCard';

type Visit = Tables<'visits'> & {
  clients?: Tables<'clients'> | null;
  pets?: Tables<'pets'> | null;
};

interface VisitDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  visit?: Visit | null;
}

export const VisitDialog = ({ open, onClose, onSave, visit }: VisitDialogProps) => {
  const handleSave = (data: any) => {
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-right">
            {visit ? 'עריכת ביקור' : 'הוספת ביקור חדש'}
          </DialogTitle>
        </DialogHeader>

        <VisitCard
          visit={visit}
          mode="edit"
          onSave={handleSave}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};
