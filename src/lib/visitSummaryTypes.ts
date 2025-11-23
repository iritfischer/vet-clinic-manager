import { Tables } from '@/integrations/supabase/types';

export interface DiagnosisItem {
  diagnosis: string;
  notes?: string;
}

export interface TreatmentItem {
  treatment: string;
  notes?: string;
}

export interface MedicationItem {
  medication: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
}

export interface VisitSummaryData {
  // Clinic info
  clinicName: string;
  clinicLogo?: string;
  clinicPhone?: string;
  clinicAddress?: string;

  // Visit info
  visitDate: string;
  visitType: string;
  vetName?: string;

  // Pet info
  petName: string;
  petSpecies: string;
  petBreed?: string;
  petSex?: string;
  petWeight?: number;
  petAge?: string;

  // Owner info
  ownerName: string;
  ownerPhone: string;

  // Medical details
  diagnoses: DiagnosisItem[];
  treatments: TreatmentItem[];
  medications: MedicationItem[];
  recommendations?: string;

  // Follow-up
  nextAppointment?: string;

  // Custom notes
  notesToOwner?: string;
}

export type VisitWithRelations = Tables<'visits'> & {
  clients?: Tables<'clients'> | null;
  pets?: Tables<'pets'> | null;
  profiles?: Tables<'profiles'> | null;
};

export type ClinicData = Tables<'clinics'>;
