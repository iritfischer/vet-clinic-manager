import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from 'lucide-react';

interface AppointmentFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  dateFilter: string;
  onDateFilterChange: (value: string) => void;
}

export const AppointmentFilters = ({
  statusFilter,
  onStatusFilterChange,
  dateFilter,
  onDateFilterChange,
}: AppointmentFiltersProps) => {
  return (
    <div className="flex flex-wrap gap-4 items-center">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <Select value={dateFilter} onValueChange={onDateFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="בחר תקופה" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל התורים</SelectItem>
            <SelectItem value="today">היום</SelectItem>
            <SelectItem value="tomorrow">מחר</SelectItem>
            <SelectItem value="week">השבוע</SelectItem>
            <SelectItem value="month">החודש</SelectItem>
            <SelectItem value="past">תורים שעברו</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="סטטוס" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">כל הסטטוסים</SelectItem>
          <SelectItem value="scheduled">מתוזמן</SelectItem>
          <SelectItem value="confirmed">אושר</SelectItem>
          <SelectItem value="completed">הושלם</SelectItem>
          <SelectItem value="cancelled">בוטל</SelectItem>
          <SelectItem value="no_show">לא הגיע</SelectItem>
        </SelectContent>
      </Select>

      {(statusFilter !== 'all' || dateFilter !== 'all') && (
        <Button
          variant="ghost"
          onClick={() => {
            onStatusFilterChange('all');
            onDateFilterChange('all');
          }}
        >
          נקה סינונים
        </Button>
      )}
    </div>
  );
};
