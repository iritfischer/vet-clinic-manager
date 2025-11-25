-- Fix missing sender_phone for inbound messages
-- Extract phone from provider_message_id if available (Green API format includes sender)
-- Or try to extract from the message metadata

-- For messages that have a client_id, we can get the phone from the client
UPDATE whatsapp_messages wm
SET sender_phone = c.phone_primary
FROM clients c
WHERE wm.client_id = c.id
  AND wm.direction = 'inbound'
  AND (wm.sender_phone IS NULL OR wm.sender_phone = '');

-- For messages without client_id, we need to handle them differently
-- They will show up as "unknown" conversations once they get sender_phone
-- These would need to be fixed manually or with additional logic
