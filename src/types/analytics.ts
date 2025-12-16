// Date range types
export type DateRangePreset = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export interface AnalyticsFilters {
  dateRange: DateRange;
  preset: DateRangePreset;
}

// Statistics summary
export interface AnalyticsStats {
  totalVisits: number;
  visitsThisWeek: number;
  totalLeads: number;
  appointmentsToday: number;
}

// Visit type breakdown
export interface VisitTypeData {
  type: string;
  label: string;
  count: number;
  percentage: number;
}

// Diagnosis breakdown
export interface DiagnosisData {
  diagnosis: string;
  count: number;
}

// Medication breakdown
export interface MedicationData {
  medication: string;
  count: number;
}

// Peak hours data
export interface PeakHourData {
  hour: number;
  hourLabel: string;
  count: number;
}

// Peak days data
export interface PeakDayData {
  dayOfWeek: number;
  dayLabel: string;
  count: number;
}

// Lead source data
export interface LeadSourceData {
  source: string;
  label: string;
  count: number;
  percentage: number;
}

// Visits trend data
export interface VisitsTrendData {
  date: string;
  dateLabel: string;
  count: number;
}

// Complete analytics data structure
export interface AnalyticsData {
  stats: AnalyticsStats;
  visitsByType: VisitTypeData[];
  topDiagnoses: DiagnosisData[];
  topMedications: MedicationData[];
  peakHours: PeakHourData[];
  peakDays: PeakDayData[];
  leadSources: LeadSourceData[];
  visitsTrend: VisitsTrendData[];
}

// Hebrew labels
export const VISIT_TYPE_LABELS: Record<string, string> = {
  checkup: 'בדיקה כללית',
  vaccination: 'חיסון',
  surgery: 'ניתוח',
  dental: 'טיפול שיניים',
  emergency: 'חירום',
  grooming: 'טיפוח',
  other: 'אחר',
};

export const LEAD_SOURCE_LABELS: Record<string, string> = {
  whatsapp: 'וואטסאפ',
  phone: 'טלפון',
  website: 'אתר אינטרנט',
  facebook: 'פייסבוק',
  instagram: 'אינסטגרם',
  referral: 'המלצה',
  walk_in: 'הגיע למקום',
  other: 'אחר',
};

export const DAY_LABELS: Record<number, string> = {
  0: 'ראשון',
  1: 'שני',
  2: 'שלישי',
  3: 'רביעי',
  4: 'חמישי',
  5: 'שישי',
  6: 'שבת',
};

export const PRESET_LABELS: Record<DateRangePreset, string> = {
  today: 'היום',
  week: 'שבוע',
  month: 'חודש',
  year: 'שנה',
  all: 'הכל',
  custom: 'מותאם',
};
