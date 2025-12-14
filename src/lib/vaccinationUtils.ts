import { supabase } from '@/integrations/supabase/client';
import { addDays, parseISO } from 'date-fns';
import { Tables } from '@/integrations/supabase/types';
import { Vaccination } from '@/hooks/useVaccinations';

type Visit = Tables<'visits'>;

/**
 * מצא את החיסון האחרון מסוג מסוים לחיית מחמד
 */
export async function findLastVaccination(
  petId: string,
  vaccinationType: string,
  clinicId: string
): Promise<Visit | null> {
  try {
    // חיפוש ביקורים עם visit_type שמתחיל ב-'vaccination:' ואחריו סוג החיסון
    const { data, error } = await supabase
      .from('visits')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('pet_id', petId)
      .like('visit_type', `vaccination:${vaccinationType}%`)
      .order('visit_date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error('Error finding last vaccination:', error);
    return null;
  }
}

/**
 * חשב את תאריך החיסון הבא על פי החיסון האחרון והמרווח ימים
 */
export function calculateNextVaccinationDate(
  lastVaccinationDate: Date,
  intervalDays: number
): Date {
  return addDays(lastVaccinationDate, intervalDays);
}

/**
 * קבל את תאריך החיסון הבא לחיית מחמד וחיסון מסוים
 */
export async function getNextVaccinationDate(
  petId: string,
  vaccinationType: string,
  vaccination: Vaccination | undefined,
  clinicId: string
): Promise<Date | null> {
  if (!vaccination) return null;

  // מצא את החיסון האחרון
  const lastVaccination = await findLastVaccination(petId, vaccinationType, clinicId);

  if (lastVaccination) {
    // אם יש חיסון קודם, חשב מהתאריך שלו
    const lastDate = parseISO(lastVaccination.visit_date);
    return calculateNextVaccinationDate(lastDate, vaccination.interval_days);
  }

  // אם אין היסטוריה, שנה מהתאריך הנוכחי
  return calculateNextVaccinationDate(new Date(), vaccination.interval_days);
}

/**
 * קבל את היסטוריית החיסונים לחיית מחמד מסוג מסוים
 */
export async function getPetVaccinationHistory(
  petId: string,
  vaccinationType: string,
  clinicId: string
): Promise<Visit[]> {
  try {
    const { data, error } = await supabase
      .from('visits')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('pet_id', petId)
      .like('visit_type', `vaccination:${vaccinationType}%`)
      .order('visit_date', { ascending: false });

    if (error) throw error;

    return (data as Visit[]) || [];
  } catch (error) {
    console.error('Error fetching vaccination history:', error);
    return [];
  }
}

/**
 * קבל את כל החיסונים הבאים לחיית מחמד
 * מחזיר מערך של { vaccination, nextDate, lastDate }
 */
export async function getAllNextVaccinations(
  petId: string,
  vaccinations: Vaccination[],
  clinicId: string
): Promise<Array<{
  vaccination: Vaccination;
  nextDate: Date | null;
  lastDate: Date | null;
}>> {
  const results = await Promise.all(
    vaccinations
      .filter(v => v.is_active)
      .map(async (vaccination) => {
        const lastVaccination = await findLastVaccination(
          petId,
          vaccination.name,
          clinicId
        );

        let nextDate: Date | null = null;
        const lastDate = lastVaccination ? parseISO(lastVaccination.visit_date) : null;

        if (lastDate) {
          nextDate = calculateNextVaccinationDate(lastDate, vaccination.interval_days);
        } else {
          nextDate = calculateNextVaccinationDate(new Date(), vaccination.interval_days);
        }

        return {
          vaccination,
          nextDate,
          lastDate,
        };
      })
  );

  return results;
}

/**
 * חלץ את סוג החיסון מ-visit_type
 * דוגמאות:
 * - "vaccination:rabies" -> "rabies"
 * - "vaccination:rabies:כלבת" -> "rabies"
 * - "checkup" -> null
 */
export function extractVaccinationType(visitType: string | null): string | null {
  if (!visitType || !visitType.startsWith('vaccination:')) {
    return null;
  }

  // הסר את "vaccination:" מההתחלה
  const withoutPrefix = visitType.substring('vaccination:'.length);

  // קח רק את החלק הראשון (לפני ':')
  const parts = withoutPrefix.split(':');
  return parts[0] || null;
}

