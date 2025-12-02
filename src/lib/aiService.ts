import { supabase } from "@/integrations/supabase/client";

export type AIContext = 'visit_notes' | 'client_summary' | 'recommendations' | 'general';

export interface ImproveTextRequest {
  text: string;
  context?: AIContext;
}

export interface ImproveTextResponse {
  success: boolean;
  improvedText?: string;
  error?: string;
}

export async function improveText(request: ImproveTextRequest): Promise<ImproveTextResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('improve-text', {
      body: {
        text: request.text,
        context: request.context || 'general',
      },
    });

    if (error) {
      console.error('Error calling improve-text function:', error);
      return {
        success: false,
        error: error.message || 'שגיאה בקריאה לשירות AI',
      };
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'שגיאה בשיפור הטקסט',
      };
    }

    return {
      success: true,
      improvedText: data.improvedText,
    };
  } catch (error) {
    console.error('Error in improveText:', error);
    return {
      success: false,
      error: 'שגיאה בחיבור לשירות AI',
    };
  }
}
