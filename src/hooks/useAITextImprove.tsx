import { useState, useCallback } from 'react';
import { improveText, type AIContext } from '@/lib/aiService';
import { useToast } from '@/hooks/use-toast';

interface UseAITextImproveOptions {
  context?: AIContext;
  onSuccess?: (improvedText: string) => void;
  onError?: (error: string) => void;
}

interface UseAITextImproveReturn {
  improve: (text: string) => Promise<string | null>;
  isLoading: boolean;
  error: string | null;
  previewText: string | null;
  clearPreview: () => void;
}

export function useAITextImprove(options: UseAITextImproveOptions = {}): UseAITextImproveReturn {
  const { context = 'general', onSuccess, onError } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const { toast } = useToast();

  const improve = useCallback(async (text: string): Promise<string | null> => {
    if (!text || text.trim().length === 0) {
      const errorMsg = 'אין טקסט לשיפור';
      setError(errorMsg);
      toast({
        title: 'שגיאה',
        description: errorMsg,
        variant: 'destructive',
      });
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await improveText({ text, context });

      if (!result.success || !result.improvedText) {
        const errorMsg = result.error || 'שגיאה בשיפור הטקסט';
        setError(errorMsg);
        onError?.(errorMsg);
        toast({
          title: 'שגיאה',
          description: errorMsg,
          variant: 'destructive',
        });
        return null;
      }

      setPreviewText(result.improvedText);
      onSuccess?.(result.improvedText);
      return result.improvedText;

    } catch (err) {
      const errorMsg = 'שגיאה בחיבור לשירות AI';
      setError(errorMsg);
      onError?.(errorMsg);
      toast({
        title: 'שגיאה',
        description: errorMsg,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [context, onSuccess, onError, toast]);

  const clearPreview = useCallback(() => {
    setPreviewText(null);
    setError(null);
  }, []);

  return {
    improve,
    isLoading,
    error,
    previewText,
    clearPreview,
  };
}
