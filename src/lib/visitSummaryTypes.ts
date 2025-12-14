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

export interface ChargeItem {
  name: string;
  quantity: number;
  pricePerUnit: number;
  total: number;
}

export interface VisitSummaryData {
  // Clinic info
  clinicName: string;
  clinicLogo?: string;
  clinicPhone?: string;
  clinicAddress?: string;
  clinicWebsite?: string;
  clinicVetLicense?: string;
  clinicEmail?: string;
  primaryColor?: string;

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

  // History & Physical Exam
  generalHistory?: string;
  medicalHistory?: string;
  currentHistory?: string;
  physicalExam?: string;

  // Medical details
  diagnoses: DiagnosisItem[];
  treatments: TreatmentItem[];
  medications: MedicationItem[];
  recommendations?: string;

  // Follow-up
  nextAppointment?: string;

  // Custom notes
  notesToOwner?: string;

  // Charges
  charges?: ChargeItem[];
  totalAmount?: number;
}

export type VisitWithRelations = Tables<'visits'> & {
  clients?: Tables<'clients'> | null;
  pets?: Tables<'pets'> | null;
  profiles?: Tables<'profiles'> | null;
};

export type ClinicData = Tables<'clinics'>;
