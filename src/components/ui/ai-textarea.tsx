import * as React from "react";
import { Textarea, TextareaProps } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AITextPreviewDialog } from "@/components/ui/ai-text-preview-dialog";
import { useAITextImprove } from "@/hooks/useAITextImprove";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIContext } from "@/lib/aiService";

export interface AITextareaProps extends TextareaProps {
  enableAI?: boolean;
  aiContext?: AIContext;
  onValueChange?: (value: string) => void;
}

const AITextarea = React.forwardRef<HTMLTextAreaElement, AITextareaProps>(
  ({ className, enableAI = true, aiContext = 'general', value, onChange, onValueChange, ...props }, ref) => {
    const [showPreview, setShowPreview] = React.useState(false);
    const [currentValue, setCurrentValue] = React.useState<string>(
      (value as string) || ''
    );
    const [improvedText, setImprovedText] = React.useState<string>('');

    const { improve, isLoading } = useAITextImprove({
      context: aiContext,
    });

    // Sync with external value changes
    React.useEffect(() => {
      if (value !== undefined) {
        setCurrentValue(value as string);
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setCurrentValue(newValue);
      onChange?.(e);
      onValueChange?.(newValue);
    };

    const handleAIClick = async () => {
      if (!currentValue || currentValue.trim().length === 0) {
        return;
      }

      const result = await improve(currentValue);
      if (result) {
        setImprovedText(result);
        setShowPreview(true);
      }
    };

    const handleApply = () => {
      // Create a synthetic event to trigger onChange
      const syntheticEvent = {
        target: { value: improvedText },
        currentTarget: { value: improvedText },
      } as React.ChangeEvent<HTMLTextAreaElement>;

      setCurrentValue(improvedText);
      onChange?.(syntheticEvent);
      onValueChange?.(improvedText);
      setShowPreview(false);
      setImprovedText('');
    };

    const handleCancel = () => {
      setShowPreview(false);
      setImprovedText('');
    };

    return (
      <div className="relative w-full">
        <div className="flex items-start gap-2" dir="rtl">
          <Textarea
            ref={ref}
            className={cn("flex-1", className)}
            value={currentValue}
            onChange={handleChange}
            {...props}
          />
          {enableAI && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-10 w-10 hover:bg-primary/10 hover:text-primary"
                    onClick={handleAIClick}
                    disabled={isLoading || !currentValue || currentValue.trim().length === 0}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>שפר טקסט עם AI</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <AITextPreviewDialog
          open={showPreview}
          onOpenChange={setShowPreview}
          originalText={currentValue}
          improvedText={improvedText}
          onApply={handleApply}
          onCancel={handleCancel}
        />
      </div>
    );
  }
);

AITextarea.displayName = "AITextarea";

export { AITextarea };
