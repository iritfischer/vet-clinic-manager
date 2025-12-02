// Tag categories enum
export const TAG_CATEGORIES = {
  VISIT_TYPE: 'visit_type',
  DIAGNOSIS: 'diagnosis',
  TREATMENT: 'treatment',
  MEDICATION: 'medication',
  REMINDER_TYPE: 'reminder_type',
  APPOINTMENT_TYPE: 'appointment_type',
  PRICE_CATEGORY: 'price_category',
  VACCINATION_TYPE: 'vaccination_type',
  CHIEF_COMPLAINT: 'chief_complaint',
  MEDICAL_HISTORY: 'medical_history',
  BREED_DOG: 'breed_dog',
  BREED_CAT: 'breed_cat',
  BREED_OTHER: 'breed_other',
} as const;

export type TagCategory = typeof TAG_CATEGORIES[keyof typeof TAG_CATEGORIES];

// Category labels for UI (Hebrew)
export const TAG_CATEGORY_LABELS: Record<TagCategory, string> = {
  visit_type: 'סוגי ביקור',
  diagnosis: 'אבחנות',
  treatment: 'טיפולים',
  medication: 'תרופות',
  reminder_type: 'סוגי תזכורת',
  appointment_type: 'סוגי תור',
  price_category: 'קטגוריות מחירון',
  vaccination_type: 'סוגי חיסון',
  chief_complaint: 'תלונות עיקריות',
  medical_history: 'היסטוריה רפואית',
  breed_dog: 'גזעי כלבים',
  breed_cat: 'גזעי חתולים',
  breed_other: 'גזעים אחרים',
};

// Tag interface matching database schema
export interface Tag {
  id: string;
  clinic_id: string;
  category: TagCategory;
  value: string;
  label: string;
  description?: string | null;
  color?: string | null;
  is_active: boolean;
  sort_order: number;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

// For creating tags
export interface TagInsert {
  category: TagCategory;
  value: string;
  label: string;
  description?: string;
  color?: string;
  is_active?: boolean;
  sort_order?: number;
}

// For updating tags
export interface TagUpdate {
  value?: string;
  label?: string;
  description?: string;
  color?: string;
  is_active?: boolean;
  sort_order?: number;
}
