// Supabase Edge Function to receive incoming WhatsApp messages from Green API
// This webhook should be configured in Green API dashboard

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting: track requests per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100;

const checkRateLimit = (ip: string): boolean => {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count++;
  return true;
};

// Format phone number: remove @c.us suffix and country code prefix for matching
const normalizePhone = (phone: string): string => {
  let cleaned = phone.replace('@c.us', '').replace('@s.whatsapp.net', '');
  cleaned = cleaned.replace(/\D/g, '');
  if (cleaned.startsWith('972')) {
    cleaned = '0' + cleaned.substring(3);
  }
  return cleaned;
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting check
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                   req.headers.get('x-real-ip') ||
                   'unknown';

  if (!checkRateLimit(clientIP)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();

    // Minimal logging - no sensitive data
    console.log('Webhook received:', body.typeWebhook, 'from instance:', body.instanceData?.idInstance);

    // Green API sends different types of webhooks
    // We're interested in incoming messages
    const { typeWebhook, instanceData, messageData, senderData } = body;

    // Only process incoming messages
    if (typeWebhook !== 'incomingMessageReceived') {
      return new Response(JSON.stringify({ status: 'ignored', type: typeWebhook }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract message details
    const instanceId = instanceData?.idInstance;
    const senderPhone = senderData?.sender?.replace('@c.us', '').replace('@s.whatsapp.net', '');
    const messageText = messageData?.textMessageData?.textMessage ||
                        messageData?.extendedTextMessageData?.text ||
                        '[הודעה לא טקסטואלית]';
    const messageId = body.idMessage;
    const timestamp = body.timestamp;

    if (!senderPhone || !messageText) {
      return new Response(JSON.stringify({ status: 'missing data' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the clinic by instance ID
    const { data: clinics, error: clinicsError } = await supabase
      .from('clinics')
      .select('id, settings')
      .not('settings', 'is', null);

    if (clinicsError) {
      console.error('Error fetching clinics:', clinicsError);
      throw clinicsError;
    }

    // Find clinic with matching WhatsApp instance ID
    let clinicId: string | null = null;
    const instanceIdStr = String(instanceId);

    for (const clinic of clinics || []) {
      const settings = clinic.settings as Record<string, any>;
      const clinicInstanceId = settings?.whatsapp?.instanceId;

      // Compare as strings (handle both string and number storage)
      if (clinicInstanceId && String(clinicInstanceId) === instanceIdStr) {
        clinicId = clinic.id;
        break;
      }
    }

    // If no clinic found, try to use the first clinic with WhatsApp settings (fallback)
    if (!clinicId && clinics && clinics.length > 0) {
      // First try to find one with isEnabled
      for (const clinic of clinics) {
        const settings = clinic.settings as Record<string, any>;
        if (settings?.whatsapp?.isEnabled) {
          clinicId = clinic.id;
          break;
        }
      }
      // If still not found, use any clinic with whatsapp settings
      if (!clinicId) {
        for (const clinic of clinics) {
          const settings = clinic.settings as Record<string, any>;
          if (settings?.whatsapp) {
            clinicId = clinic.id;
            break;
          }
        }
      }
      // Last resort - just use the first clinic
      if (!clinicId && clinics.length > 0) {
        clinicId = clinics[0].id;
      }
    }

    if (!clinicId) {
      console.log('No clinic found for instance');
      return new Response(JSON.stringify({ status: 'no clinic found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find client by phone number (try different formats)
    const normalizedPhone = normalizePhone(senderPhone);
    const phoneLast9 = normalizedPhone.slice(-9);
    const phoneWithZero = '0' + phoneLast9;
    const phoneWith972 = '972' + phoneLast9;

    // Try multiple phone formats to find the client
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, phone_primary, phone_secondary')
      .eq('clinic_id', clinicId)
      .or(`phone_primary.ilike.%${phoneLast9},phone_secondary.ilike.%${phoneLast9},phone_primary.eq.${phoneWithZero},phone_secondary.eq.${phoneWithZero},phone_primary.eq.${phoneWith972},phone_secondary.eq.${phoneWith972}`);

    if (clientsError) {
      console.error('Error fetching clients');
    }

    const client = clients?.[0];

    // Save the incoming message
    const messageToInsert: Record<string, any> = {
      clinic_id: clinicId,
      client_id: client?.id || null,
      content: messageText,
      direction: 'inbound',
      provider_message_id: messageId,
      sender_phone: senderPhone,
      sent_at: timestamp ? new Date(timestamp * 1000).toISOString() : new Date().toISOString(),
    };

    const { error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert(messageToInsert);

    if (insertError) {
      console.error('Error saving message');
      throw insertError;
    }

    return new Response(
      JSON.stringify({ status: 'success' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
