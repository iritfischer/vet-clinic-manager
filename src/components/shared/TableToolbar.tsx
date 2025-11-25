import { Search, Download, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

interface TableToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  onExport?: () => void;
  totalCount?: number;
  filteredCount?: number;
}

export const TableToolbar = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'חיפוש...',
  filters,
  onExport,
  totalCount,
  filteredCount,
}: TableToolbarProps) => {
  const hasActiveFilters = filters?.some(f => f.value !== 'all') || searchValue.length > 0;

  const clearAllFilters = () => {
    onSearchChange('');
    filters?.forEach(f => f.onChange('all'));
  };

  return (
    <div className="flex flex-wrap gap-4 items-center justify-between mb-4 p-4 bg-white rounded-lg border border-gray-200">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pr-10 bg-gray-50 border-gray-200 focus:bg-white"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center flex-wrap">
        {filters?.map((filter) => (
          <Select key={filter.key} value={filter.value} onValueChange={filter.onChange} dir="rtl">
            <SelectTrigger className="w-[140px] bg-gray-50 border-gray-200 text-right">
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent align="end">
              {filter.options.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-right">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4 ml-1" />
            נקה פילטרים
          </Button>
        )}
      </div>

      {/* Count & Export */}
      <div className="flex items-center gap-4">
        {totalCount !== undefined && filteredCount !== undefined && (
          <span className="text-sm text-gray-500">
            {filteredCount === totalCount ? (
              `${totalCount} פריטים`
            ) : (
              `${filteredCount} מתוך ${totalCount}`
            )}
          </span>
        )}

        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport} className="border-gray-200">
            <Download className="h-4 w-4 ml-2" />
            ייצוא
          </Button>
        )}
      </div>
    </div>
  );
};
