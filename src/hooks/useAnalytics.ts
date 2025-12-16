import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  format,
  getHours,
  getDay,
  parseISO,
  eachMonthOfInterval,
  eachWeekOfInterval,
  eachDayOfInterval,
  isWithinInterval,
} from 'date-fns';
import { he } from 'date-fns/locale';
import {
  DateRange,
  DateRangePreset,
  AnalyticsData,
  AnalyticsStats,
  VisitTypeData,
  DiagnosisData,
  MedicationData,
  PeakHourData,
  PeakDayData,
  LeadSourceData,
  VisitsTrendData,
  VISIT_TYPE_LABELS,
  LEAD_SOURCE_LABELS,
  DAY_LABELS,
} from '@/types/analytics';

export const getDateRangeFromPreset = (preset: DateRangePreset): DateRange => {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { startDate: startOfDay(now), endDate: endOfDay(now) };
    case 'week':
      return { startDate: startOfWeek(now, { weekStartsOn: 0 }), endDate: endOfWeek(now, { weekStartsOn: 0 }) };
    case 'month':
      return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
    case 'year':
      return { startDate: startOfYear(now), endDate: endOfYear(now) };
    case 'all':
      return { startDate: null, endDate: null };
    default:
      return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
  }
};

export const useAnalytics = () => {
  const { clinicId, loading: clinicLoading } = useClinic();
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<DateRangePreset>('month');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeFromPreset('month'));
  const [data, setData] = useState<AnalyticsData | null>(null);

  const fetchAnalyticsData = useCallback(async () => {
    if (!clinicId) return;

    setLoading(true);
    try {
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

      // Build date filter queries
      let visitsQuery = supabase
        .from('visits')
        .select('id, visit_type, visit_date, diagnoses, medications, status')
        .eq('clinic_id', clinicId);

      let appointmentsQuery = supabase
        .from('appointments')
        .select('id, start_time, status')
        .eq('clinic_id', clinicId);

      let leadsQuery = supabase
        .from('leads')
        .select('id, source, status, created_at')
        .eq('clinic_id', clinicId);

      // Apply date range filters if not "all"
      if (dateRange.startDate && dateRange.endDate) {
        visitsQuery = visitsQuery
          .gte('visit_date', dateRange.startDate.toISOString())
          .lte('visit_date', dateRange.endDate.toISOString());

        appointmentsQuery = appointmentsQuery
          .gte('start_time', dateRange.startDate.toISOString())
          .lte('start_time', dateRange.endDate.toISOString());

        leadsQuery = leadsQuery
          .gte('created_at', dateRange.startDate.toISOString())
          .lte('created_at', dateRange.endDate.toISOString());
      }

      // Fetch all data in parallel
      const [
        visitsResult,
        appointmentsResult,
        leadsResult,
        // Stats queries (always for current period)
        totalVisitsResult,
        visitsThisWeekResult,
        appointmentsTodayResult,
        totalLeadsResult,
      ] = await Promise.all([
        visitsQuery.order('visit_date', { ascending: false }),
        appointmentsQuery.order('start_time', { ascending: false }),
        leadsQuery.order('created_at', { ascending: false }),
        // Stats
        supabase
          .from('visits')
          .select('id', { count: 'exact', head: true })
          .eq('clinic_id', clinicId),
        supabase
          .from('visits')
          .select('id', { count: 'exact', head: true })
          .eq('clinic_id', clinicId)
          .gte('visit_date', weekStart.toISOString())
          .lte('visit_date', weekEnd.toISOString()),
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('clinic_id', clinicId)
          .gte('start_time', startOfDay(today).toISOString())
          .lte('start_time', endOfDay(today).toISOString()),
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('clinic_id', clinicId),
      ]);

      const visits = visitsResult.data || [];
      const appointments = appointmentsResult.data || [];
      const leads = leadsResult.data || [];

      // Process stats
      const stats: AnalyticsStats = {
        totalVisits: totalVisitsResult.count || 0,
        visitsThisWeek: visitsThisWeekResult.count || 0,
        appointmentsToday: appointmentsTodayResult.count || 0,
        totalLeads: totalLeadsResult.count || 0,
      };

      // Process visits by type
      const visitTypeCount: Record<string, number> = {};
      visits.forEach((visit: any) => {
        const type = visit.visit_type || 'other';
        visitTypeCount[type] = (visitTypeCount[type] || 0) + 1;
      });

      const totalVisitsInRange = visits.length;
      const visitsByType: VisitTypeData[] = Object.entries(visitTypeCount)
        .map(([type, count]) => ({
          type,
          label: VISIT_TYPE_LABELS[type] || type,
          count,
          percentage: totalVisitsInRange > 0 ? Math.round((count / totalVisitsInRange) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // Process diagnoses
      const diagnosisCount: Record<string, number> = {};
      visits.forEach((visit: any) => {
        if (visit.diagnoses && Array.isArray(visit.diagnoses)) {
          visit.diagnoses.forEach((d: any) => {
            const diagnosis = d.diagnosis || d.text || d;
            if (typeof diagnosis === 'string' && diagnosis.trim()) {
              diagnosisCount[diagnosis] = (diagnosisCount[diagnosis] || 0) + 1;
            }
          });
        }
      });

      const topDiagnoses: DiagnosisData[] = Object.entries(diagnosisCount)
        .map(([diagnosis, count]) => ({ diagnosis, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Process medications
      const medicationCount: Record<string, number> = {};
      visits.forEach((visit: any) => {
        if (visit.medications && Array.isArray(visit.medications)) {
          visit.medications.forEach((m: any) => {
            const medication = m.medication || m.name || m;
            if (typeof medication === 'string' && medication.trim()) {
              medicationCount[medication] = (medicationCount[medication] || 0) + 1;
            }
          });
        }
      });

      const topMedications: MedicationData[] = Object.entries(medicationCount)
        .map(([medication, count]) => ({ medication, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Process peak hours (from appointments)
      const hourCount: Record<number, number> = {};
      for (let i = 0; i < 24; i++) hourCount[i] = 0;

      appointments.forEach((apt: any) => {
        if (apt.start_time) {
          const hour = getHours(parseISO(apt.start_time));
          hourCount[hour] = (hourCount[hour] || 0) + 1;
        }
      });

      const peakHours: PeakHourData[] = Object.entries(hourCount)
        .map(([hour, count]) => ({
          hour: parseInt(hour),
          hourLabel: `${hour.padStart(2, '0')}:00`,
          count,
        }))
        .filter((h) => h.hour >= 7 && h.hour <= 20); // Only show business hours

      // Process peak days
      const dayCount: Record<number, number> = {};
      for (let i = 0; i < 7; i++) dayCount[i] = 0;

      appointments.forEach((apt: any) => {
        if (apt.start_time) {
          const day = getDay(parseISO(apt.start_time));
          dayCount[day] = (dayCount[day] || 0) + 1;
        }
      });

      const peakDays: PeakDayData[] = Object.entries(dayCount)
        .map(([day, count]) => ({
          dayOfWeek: parseInt(day),
          dayLabel: DAY_LABELS[parseInt(day)] || day,
          count,
        }))
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek);

      // Process lead sources
      const sourceCount: Record<string, number> = {};
      leads.forEach((lead: any) => {
        const source = lead.source || 'other';
        sourceCount[source] = (sourceCount[source] || 0) + 1;
      });

      const totalLeadsInRange = leads.length;
      const leadSources: LeadSourceData[] = Object.entries(sourceCount)
        .map(([source, count]) => ({
          source,
          label: LEAD_SOURCE_LABELS[source] || source,
          count,
          percentage: totalLeadsInRange > 0 ? Math.round((count / totalLeadsInRange) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // Process visits trend
      let visitsTrend: VisitsTrendData[] = [];

      if (visits.length > 0 && dateRange.startDate && dateRange.endDate) {
        const interval = { start: dateRange.startDate, end: dateRange.endDate };
        const daysDiff = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff <= 31) {
          // Daily breakdown
          const days = eachDayOfInterval(interval);
          visitsTrend = days.map((day) => {
            const dayStart = startOfDay(day);
            const dayEnd = endOfDay(day);
            const count = visits.filter((v: any) => {
              const visitDate = parseISO(v.visit_date);
              return isWithinInterval(visitDate, { start: dayStart, end: dayEnd });
            }).length;

            return {
              date: day.toISOString(),
              dateLabel: format(day, 'dd/MM', { locale: he }),
              count,
            };
          });
        } else if (daysDiff <= 365) {
          // Weekly breakdown
          const weeks = eachWeekOfInterval(interval, { weekStartsOn: 0 });
          visitsTrend = weeks.map((weekStart) => {
            const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
            const count = visits.filter((v: any) => {
              const visitDate = parseISO(v.visit_date);
              return isWithinInterval(visitDate, { start: weekStart, end: weekEnd });
            }).length;

            return {
              date: weekStart.toISOString(),
              dateLabel: format(weekStart, 'dd/MM', { locale: he }),
              count,
            };
          });
        } else {
          // Monthly breakdown
          const months = eachMonthOfInterval(interval);
          visitsTrend = months.map((monthStart) => {
            const monthEnd = endOfMonth(monthStart);
            const count = visits.filter((v: any) => {
              const visitDate = parseISO(v.visit_date);
              return isWithinInterval(visitDate, { start: monthStart, end: monthEnd });
            }).length;

            return {
              date: monthStart.toISOString(),
              dateLabel: format(monthStart, 'MMM yy', { locale: he }),
              count,
            };
          });
        }
      }

      setData({
        stats,
        visitsByType,
        topDiagnoses,
        topMedications,
        peakHours,
        peakDays,
        leadSources,
        visitsTrend,
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, [clinicId, dateRange]);

  useEffect(() => {
    if (!clinicLoading) {
      fetchAnalyticsData();
    }
  }, [clinicLoading, fetchAnalyticsData]);

  const updatePreset = useCallback((newPreset: DateRangePreset) => {
    setPreset(newPreset);
    if (newPreset !== 'custom') {
      setDateRange(getDateRangeFromPreset(newPreset));
    }
  }, []);

  const updateDateRange = useCallback((newRange: DateRange) => {
    setDateRange(newRange);
    setPreset('custom');
  }, []);

  return {
    loading,
    data,
    preset,
    dateRange,
    updatePreset,
    updateDateRange,
    refetch: fetchAnalyticsData,
  };
};
