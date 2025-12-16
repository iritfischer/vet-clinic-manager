import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Loader2, FileText, Calendar, Users, TrendingUp } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { StatCard } from '@/components/analytics/StatCard';
import { AnalyticsFilters } from '@/components/analytics/AnalyticsFilters';
import { VisitsByTypeChart } from '@/components/analytics/VisitsByTypeChart';
import { TopDiagnosesChart } from '@/components/analytics/TopDiagnosesChart';
import { TopMedicationsChart } from '@/components/analytics/TopMedicationsChart';
import { LeadSourcesChart } from '@/components/analytics/LeadSourcesChart';
import { PeakHoursChart } from '@/components/analytics/PeakHoursChart';
import { VisitsTrendChart } from '@/components/analytics/VisitsTrendChart';

const Analytics = () => {
  const { loading, data, preset, dateRange, updatePreset, updateDateRange } = useAnalytics();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">אנליטיקה</h1>
            <p className="text-muted-foreground mt-1">
              סטטיסטיקות ונתונים על פעילות המרפאה
            </p>
          </div>

          {/* Filters */}
          <AnalyticsFilters
            preset={preset}
            dateRange={dateRange}
            onPresetChange={updatePreset}
            onDateRangeChange={updateDateRange}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="סה״כ ביקורים"
            value={data?.stats.totalVisits || 0}
            description="כל הביקורים במערכת"
            icon={FileText}
          />
          <StatCard
            title="ביקורים השבוע"
            value={data?.stats.visitsThisWeek || 0}
            description="ביקורים בשבוע הנוכחי"
            icon={TrendingUp}
          />
          <StatCard
            title="לידים"
            value={data?.stats.totalLeads || 0}
            description="סה״כ לידים במערכת"
            icon={Users}
          />
          <StatCard
            title="תורים היום"
            value={data?.stats.appointmentsToday || 0}
            description="תורים שנקבעו להיום"
            icon={Calendar}
          />
        </div>

        {/* Charts - Row 1: Pie Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <VisitsByTypeChart data={data?.visitsByType || []} />
          <LeadSourcesChart data={data?.leadSources || []} />
        </div>

        {/* Charts - Row 2: Bar Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <TopDiagnosesChart data={data?.topDiagnoses || []} />
          <TopMedicationsChart data={data?.topMedications || []} />
        </div>

        {/* Charts - Row 3: Peak Hours */}
        <PeakHoursChart
          hoursData={data?.peakHours || []}
          daysData={data?.peakDays || []}
        />

        {/* Charts - Row 4: Trend */}
        <VisitsTrendChart data={data?.visitsTrend || []} />
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
