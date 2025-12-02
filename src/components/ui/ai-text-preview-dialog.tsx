import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X } from "lucide-react";

interface AITextPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalText: string;
  improvedText: string;
  onApply: () => void;
  onCancel: () => void;
}

export function AITextPreviewDialog({
  open,
  onOpenChange,
  originalText,
  improvedText,
  onApply,
  onCancel,
}: AITextPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">תצוגה מקדימה - שיפור AI</DialogTitle>
          <DialogDescription className="text-right">
            בדוק את הטקסט המשופר לפני החלתו
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Original Text */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground text-right">טקסט מקורי</h4>
            <ScrollArea className="h-[200px] w-full rounded-md border p-3 bg-muted/30">
              <p className="text-sm whitespace-pre-wrap text-right" dir="rtl">
                {originalText}
              </p>
            </ScrollArea>
          </div>

          {/* Improved Text */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-primary text-right">טקסט משופר</h4>
            <ScrollArea className="h-[200px] w-full rounded-md border p-3 bg-primary/5 border-primary/20">
              <p className="text-sm whitespace-pre-wrap text-right" dir="rtl">
                {improvedText}
              </p>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="flex-row-reverse gap-2 sm:gap-0">
          <Button onClick={onApply} className="gap-2">
            <Check className="h-4 w-4" />
            החל שינויים
          </Button>
          <Button variant="outline" onClick={onCancel} className="gap-2">
            <X className="h-4 w-4" />
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
