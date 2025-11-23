import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, message, visitId } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get WhatsApp API credentials from secrets
    const whatsappApiKey = Deno.env.get('WHATSAPP_API_KEY');
    const whatsappApiUrl = Deno.env.get('WHATSAPP_API_URL');
    const whatsappPhoneId = Deno.env.get('WHATSAPP_PHONE_ID');

    if (!whatsappApiKey || !whatsappApiUrl || !whatsappPhoneId) {
      throw new Error('WhatsApp API credentials not configured');
    }

    // Format phone number (remove non-digits and add country code if needed)
    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('972')) {
      formattedPhone = '972' + formattedPhone.replace(/^0/, '');
    }

    // Send WhatsApp message via API
    const response = await fetch(`${whatsappApiUrl}/${whatsappPhoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: {
          body: message,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WhatsApp API error: ${error}`);
    }

    const result = await response.json();

    // Log the message in the database
    if (visitId) {
      const { data: visit } = await supabaseClient
        .from('visits')
        .select('clinic_id, client_id')
        .eq('id', visitId)
        .single();

      if (visit) {
        await supabaseClient
          .from('whatsapp_messages')
          .insert({
            clinic_id: visit.clinic_id,
            client_id: visit.client_id,
            direction: 'outgoing',
            content: message,
            provider_message_id: result.messages?.[0]?.id,
          });
      }
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.messages?.[0]?.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
