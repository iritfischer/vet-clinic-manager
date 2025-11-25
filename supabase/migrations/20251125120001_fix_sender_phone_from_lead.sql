-- Fix missing sender_phone for inbound messages linked to leads
UPDATE whatsapp_messages wm
SET sender_phone = l.phone
FROM leads l
WHERE wm.lead_id = l.id
  AND wm.direction = 'inbound'
  AND (wm.sender_phone IS NULL OR wm.sender_phone = '');
