import { Database } from '@/integrations/supabase/types';

// Lead type from database
export type Lead = Database['public']['Tables']['leads']['Row'];
export type LeadInsert = Database['public']['Tables']['leads']['Insert'];
export type LeadUpdate = Database['public']['Tables']['leads']['Update'];

// Lead status enum
export type LeadStatus = 'new' | 'contacted' | 'converted' | 'lost';

// Lead source enum
export type LeadSource = 'whatsapp' | 'phone' | 'website' | 'facebook' | 'instagram' | 'referral' | 'walk_in' | 'other';

// Form data for creating/editing leads
export interface LeadFormData {
  first_name: string;
  last_name?: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  status: LeadStatus;
  source?: LeadSource;
  pet_name?: string;
  pet_species?: string;
  pet_breed?: string;
  pet_notes?: string;
}

// WhatsApp message type
export type WhatsAppMessage = Database['public']['Tables']['whatsapp_messages']['Row'];

// Client type for reference
export type Client = Database['public']['Tables']['clients']['Row'];

// Conversation type - groups messages by phone number
export interface Conversation {
  id: string; // Unique identifier (phone number normalized)
  phone: string; // Original phone number
  type: 'client' | 'lead' | 'unknown';
  name: string; // Display name
  clientId?: string;
  leadId?: string;
  client?: Client;
  lead?: Lead;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: WhatsAppMessage[];
}

// Filter type for conversation list
export type ConversationFilter = 'all' | 'clients' | 'leads' | 'unknown';
