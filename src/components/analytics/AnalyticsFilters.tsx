import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange, DateRangePreset, PRESET_LABELS } from '@/types/analytics';

interface AnalyticsFiltersProps {
  preset: DateRangePreset;
  dateRange: DateRange;
  onPresetChange: (preset: DateRangePreset) => void;
  onDateRangeChange: (range: DateRange) => void;
}

const presets: DateRangePreset[] = ['today', 'week', 'month', 'year', 'all'];

export const AnalyticsFilters = ({
  preset,
  dateRange,
  onPresetChange,
  onDateRangeChange,
}: AnalyticsFiltersProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Preset buttons */}
      {presets.map((p) => (
        <Button
          key={p}
          variant={preset === p ? 'default' : 'outline'}
          size="sm"
          onClick={() => onPresetChange(p)}
        >
          {PRESET_LABELS[p]}
        </Button>
      ))}

      {/* Custom date range */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={preset === 'custom' ? 'default' : 'outline'}
            size="sm"
            className={cn('gap-2')}
          >
            <CalendarIcon className="h-4 w-4" />
            {preset === 'custom' && dateRange.startDate && dateRange.endDate ? (
              <span>
                {format(dateRange.startDate, 'dd/MM/yy', { locale: he })} -{' '}
                {format(dateRange.endDate, 'dd/MM/yy', { locale: he })}
              </span>
            ) : (
              <span>{PRESET_LABELS.custom}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{
              from: dateRange.startDate || undefined,
              to: dateRange.endDate || undefined,
            }}
            onSelect={(range) => {
              if (range?.from) {
                onDateRangeChange({
                  startDate: range.from,
                  endDate: range.to || range.from,
                });
              }
            }}
            locale={he}
            dir="rtl"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
