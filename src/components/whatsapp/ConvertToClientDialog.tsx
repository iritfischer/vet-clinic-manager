import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowUpCircle, User, PawPrint, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { Lead } from '@/types/leads';
import { useState } from 'react';

interface ConvertToClientDialogProps {
  open: boolean;
  onClose: () => void;
  onConvert: (createPet: boolean) => void;
  lead: Lead | null;
  converting: boolean;
}

export const ConvertToClientDialog = ({
  open,
  onClose,
  onConvert,
  lead,
  converting,
}: ConvertToClientDialogProps) => {
  const [createPet, setCreatePet] = useState(true);

  if (!lead) return null;

  const hasPetInfo = !!(lead.pet_name || lead.pet_species);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5 text-green-600" />
            המרת ליד ללקוח
          </DialogTitle>
          <DialogDescription className="text-right">
            האם להמיר את הליד הזה ללקוח פעיל במערכת?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4" dir="rtl">
          {/* Lead Info Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Badge className="bg-yellow-100 text-yellow-800">ליד</Badge>
              <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
              <Badge className="bg-green-100 text-green-800">
                <User className="h-3 w-3 ml-1" />
                לקוח
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {lead.first_name} {lead.last_name || ''}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span dir="ltr">{lead.phone}</span>
              </div>

              {lead.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.email}</span>
                </div>
              )}

              {lead.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.address}</span>
                </div>
              )}

              {lead.notes && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm text-muted-foreground">{lead.notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Pet Info (if exists) */}
          {hasPetInfo && (
            <div className="bg-blue-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <PawPrint className="h-4 w-4 text-blue-600" />
                <span className="font-medium">פרטי חיית מחמד</span>
              </div>

              <div className="space-y-1 text-sm">
                {lead.pet_name && (
                  <p>שם: {lead.pet_name}</p>
                )}
                {lead.pet_species && (
                  <p>סוג: {lead.pet_species}</p>
                )}
                {lead.pet_breed && (
                  <p>גזע: {lead.pet_breed}</p>
                )}
                {lead.pet_notes && (
                  <p className="text-muted-foreground">{lead.pet_notes}</p>
                )}
              </div>

              <div className="flex items-center space-x-2 space-x-reverse pt-2">
                <Checkbox
                  id="createPet"
                  checked={createPet}
                  onCheckedChange={(checked) => setCreatePet(checked as boolean)}
                />
                <Label htmlFor="createPet" className="text-sm">
                  צור גם חיית מחמד עבור הלקוח החדש
                </Label>
              </div>
            </div>
          )}

          {/* What will happen */}
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">מה יקרה:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>ייווצר לקוח חדש עם כל הפרטים</li>
              {hasPetInfo && createPet && <li>תיווצר חיית מחמד חדשה</li>}
              <li>כל ההודעות יקושרו ללקוח החדש</li>
              <li>הליד יסומן כ"הומר"</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-start pt-2">
            <Button
              onClick={() => onConvert(hasPetInfo && createPet)}
              disabled={converting}
            >
              {converting ? (
                <>
                  <span className="animate-spin ml-2">⏳</span>
                  ממיר...
                </>
              ) : (
                <>
                  <ArrowUpCircle className="h-4 w-4 ml-2" />
                  המר ללקוח
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={converting}>
              ביטול
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
