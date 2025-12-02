import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// System prompt for veterinary context in Hebrew
const SYSTEM_PROMPT = `אתה עוזר וטרינרי מקצועי. המשימה שלך היא לשפר ולהרחיב טקסטים רפואיים-וטרינריים.

הנחיות:
1. שפר את הניסוח להיות מקצועי ובהיר יותר
2. הוסף פרטים רלוונטיים כאשר מתאים
3. שמור על השפה העברית הרפואית המקובלת
4. אל תשנה עובדות או מידע קליני מהותי
5. הפוך את הטקסט לקריא ומסודר יותר
6. התאם את הסגנון לקהל היעד (רופא וטרינר או בעל חיה)
7. החזר רק את הטקסט המשופר, ללא הסברים נוספים`;

// Context-specific prompts
const CONTEXT_PROMPTS: Record<string, string> = {
  visit_notes: 'זהו רישום ביקור וטרינרי. שפר את הרישום להיות מקצועי ומדויק.',
  client_summary: 'זהו סיכום ללקוח (בעל החיה). שפר להיות ברור ונגיש להדיוט.',
  recommendations: 'אלו המלצות לבעל החיה. שפר להיות ברורות וישימות.',
  general: 'שפר את הטקסט להיות מקצועי וברור יותר.',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, context = 'general' } = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Text is required');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const contextPrompt = CONTEXT_PROMPTS[context] || CONTEXT_PROMPTS.general;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `${contextPrompt}\n\nטקסט לשיפור:\n${text}` }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    const improvedText = result.choices?.[0]?.message?.content?.trim();

    if (!improvedText) {
      throw new Error('No response from AI');
    }

    return new Response(
      JSON.stringify({
        success: true,
        improvedText,
        originalLength: text.length,
        improvedLength: improvedText.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in improve-text function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
