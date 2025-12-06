import { useEffect, useRef, useState, useCallback } from 'react';
import { Tables } from '@/integrations/supabase/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  clinicId?: string | null;
  onCreateDraft?: () => Promise<string | null>;
  draftVisitId?: string | null;
  draftDataToRestore?: Record<string, unknown> | null;
}

export const VisitDialog = ({
  open,
  onClose,
  onSave,
  visit,
  clinicId,
  onCreateDraft,
  draftVisitId,
  draftDataToRestore,
}: VisitDialogProps) => {
  const hasCreatedDraft = useRef(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Create draft when dialog opens for new visit (only if no existing draft to restore)
  useEffect(() => {
    if (open && !visit && onCreateDraft && !hasCreatedDraft.current && !draftVisitId && !draftDataToRestore) {
      hasCreatedDraft.current = true;
      onCreateDraft();
    }

    // Reset the ref when dialog closes
    if (!open) {
      hasCreatedDraft.current = false;
      setHasUnsavedChanges(false);
    }
  }, [open, visit, onCreateDraft, draftVisitId, draftDataToRestore]);

  const handleSave = (data: any) => {
    setHasUnsavedChanges(false);
    onSave(data);
  };

  const handleFormChange = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  const handleCloseAttempt = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  const handleConfirmClose = useCallback(() => {
    setShowConfirmDialog(false);
    setHasUnsavedChanges(false);
    onClose();
  }, [onClose]);

  // Determine the visitId to use for auto-save
  const visitId = visit?.id || draftVisitId || undefined;

  return (
    <>
      <Dialog open={open} onOpenChange={handleCloseAttempt}>
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
            onCancel={handleCloseAttempt}
            visitId={visitId}
            clinicId={clinicId}
            draftDataToRestore={draftDataToRestore}
            onFormChange={handleFormChange}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">יש שינויים שלא נשמרו</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              האם את בטוחה שברצונך לצאת? השינויים שלא נשמרו יאבדו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>המשך לערוך</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>
              צא בלי לשמור
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
