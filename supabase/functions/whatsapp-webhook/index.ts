// Supabase Edge Function to receive incoming WhatsApp messages from Green API
// This webhook should be configured in Green API dashboard

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Format phone number: remove @c.us suffix and country code prefix for matching
const normalizePhone = (phone: string): string => {
  let cleaned = phone.replace('@c.us', '').replace('@s.whatsapp.net', '');
  // Remove leading zeros and country code variations
  cleaned = cleaned.replace(/\D/g, '');
  // If starts with 972, keep last 9 digits for Israeli numbers
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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log('=== WEBHOOK RECEIVED ===');
    console.log('Full body:', JSON.stringify(body, null, 2));
    console.log('typeWebhook:', body.typeWebhook);
    console.log('instanceData:', JSON.stringify(body.instanceData));
    console.log('senderData:', JSON.stringify(body.senderData));
    console.log('messageData:', JSON.stringify(body.messageData));

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
    console.log('Looking for clinic with instanceId:', instanceIdStr, 'type:', typeof instanceId);
    console.log('Found clinics with settings:', clinics?.length || 0);

    // Log all clinic settings for debugging
    for (const clinic of clinics || []) {
      const settings = clinic.settings as Record<string, any>;
      const clinicInstanceId = settings?.whatsapp?.instanceId;
      console.log('Clinic', clinic.id, 'whatsapp settings:', JSON.stringify(settings?.whatsapp));
      console.log('  - clinicInstanceId:', clinicInstanceId, 'type:', typeof clinicInstanceId);
      console.log('  - comparing:', String(clinicInstanceId), '===', instanceIdStr, '?', String(clinicInstanceId) === instanceIdStr);

      // Compare as strings (handle both string and number storage)
      if (clinicInstanceId && String(clinicInstanceId) === instanceIdStr) {
        clinicId = clinic.id;
        console.log('Found matching clinic:', clinicId);
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
          console.log('Using first enabled WhatsApp clinic as fallback:', clinicId);
          break;
        }
      }
      // If still not found, use any clinic with whatsapp settings
      if (!clinicId) {
        for (const clinic of clinics) {
          const settings = clinic.settings as Record<string, any>;
          if (settings?.whatsapp) {
            clinicId = clinic.id;
            console.log('Using first clinic with WhatsApp config as fallback:', clinicId);
            break;
          }
        }
      }
      // Last resort - just use the first clinic
      if (!clinicId && clinics.length > 0) {
        clinicId = clinics[0].id;
        console.log('Using first available clinic as last resort fallback:', clinicId);
      }
    }

    if (!clinicId) {
      console.log('No clinic found for instance:', instanceIdStr);
      return new Response(JSON.stringify({
        status: 'no clinic found',
        searchedFor: instanceIdStr,
        clinicsChecked: clinics?.length || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find client by phone number (try different formats)
    const normalizedPhone = normalizePhone(senderPhone);
    const phoneLast9 = normalizedPhone.slice(-9);
    const phoneWithZero = '0' + phoneLast9;
    const phoneWith972 = '972' + phoneLast9;

    console.log('Searching for client with phone variants:', {
      senderPhone,
      normalizedPhone,
      phoneLast9,
      phoneWithZero,
      phoneWith972
    });

    // Try multiple phone formats to find the client
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, phone_primary, phone_secondary')
      .eq('clinic_id', clinicId)
      .or(`phone_primary.ilike.%${phoneLast9},phone_secondary.ilike.%${phoneLast9},phone_primary.eq.${phoneWithZero},phone_secondary.eq.${phoneWithZero},phone_primary.eq.${phoneWith972},phone_secondary.eq.${phoneWith972}`);

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
    }

    console.log('Clients found:', clients?.length || 0);
    if (clients && clients.length > 0) {
      console.log('First matching client:', clients[0]);
    } else {
      console.log('No client found for phone. Will save message without client_id.');
    }

    const client = clients?.[0];

    // Save the incoming message - include sender_phone!
    const messageToInsert: Record<string, any> = {
      clinic_id: clinicId,
      client_id: client?.id || null,
      content: messageText,
      direction: 'inbound',
      provider_message_id: messageId,
      sender_phone: senderPhone, // This is critical for grouping conversations!
      sent_at: timestamp ? new Date(timestamp * 1000).toISOString() : new Date().toISOString(),
    };

    console.log('Inserting message:', messageToInsert);
    console.log('Client found:', client ? client.id : 'none');

    const { data: insertedData, error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert(messageToInsert)
      .select();

    if (insertError) {
      console.error('Error saving message:', insertError);
      console.error('Insert error details:', JSON.stringify(insertError));
      throw insertError;
    }

    console.log('Message saved successfully:', insertedData);
    console.log('For client:', client?.id || 'unknown');

    return new Response(
      JSON.stringify({
        status: 'success',
        clientId: client?.id,
        clinicId,
      }),
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
