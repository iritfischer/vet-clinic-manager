import { Button } from '@/components/ui/button';
import { Calendar, Table } from 'lucide-react';

interface AppointmentViewToggleProps {
  view: 'calendar' | 'table';
  onViewChange: (view: 'calendar' | 'table') => void;
}

export const AppointmentViewToggle = ({ view, onViewChange }: AppointmentViewToggleProps) => {
  return (
    <div className="flex gap-2 border rounded-lg p-1 bg-muted">
      <Button
        variant={view === 'calendar' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('calendar')}
        className="gap-2"
      >
        <Calendar className="h-4 w-4" />
        יומן
      </Button>
      <Button
        variant={view === 'table' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('table')}
        className="gap-2"
      >
        <Table className="h-4 w-4" />
        טבלה
      </Button>
    </div>
  );
};
