import { useState, useCallback, useMemo } from 'react';
import { Check, ChevronsUpDown, Plus, X, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { useTagsByCategory } from '@/hooks/useTags';
import { TagCategory } from '@/types/tags';

// Color presets for quick selection
const QUICK_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

interface TagInputProps {
  category: TagCategory;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  disabled?: boolean;
  allowCreate?: boolean;
  className?: string;
}

export const TagInput = ({
  category,
  value,
  onChange,
  multiple = false,
  placeholder = 'בחר...',
  disabled = false,
  allowCreate = true,
  className,
}: TagInputProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const { tags, loading, createTagInline, incrementUsage, getTagByValue } = useTagsByCategory(category);

  // Normalize value to array for internal handling
  const selectedValues = useMemo(() => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }, [value]);

  // Filter tags based on search query
  const filteredTags = useMemo(() => {
    if (!searchQuery) return tags;
    const query = searchQuery.toLowerCase();
    return tags.filter(
      tag =>
        tag.label.toLowerCase().includes(query) ||
        tag.value.toLowerCase().includes(query)
    );
  }, [tags, searchQuery]);

  // Check if search query matches any existing tag
  const canCreateNew = useMemo(() => {
    if (!allowCreate || !searchQuery.trim()) return false;
    const query = searchQuery.toLowerCase().trim();
    return !tags.some(
      tag =>
        tag.label.toLowerCase() === query ||
        tag.value.toLowerCase() === query
    );
  }, [allowCreate, searchQuery, tags]);

  // Get display label for a value
  const getDisplayLabel = useCallback(
    (val: string) => {
      const tag = getTagByValue(val);
      return tag?.label || val;
    },
    [getTagByValue]
  );

  // Get tag color for a value
  const getTagColor = useCallback(
    (val: string) => {
      const tag = getTagByValue(val);
      return tag?.color || null;
    },
    [getTagByValue]
  );

  // Handle selection
  const handleSelect = useCallback(
    async (selectedValue: string) => {
      // Increment usage for the selected tag
      const tag = tags.find(t => t.value === selectedValue);
      if (tag) {
        incrementUsage(tag.id);
      }

      if (multiple) {
        const newValues = selectedValues.includes(selectedValue)
          ? selectedValues.filter(v => v !== selectedValue)
          : [...selectedValues, selectedValue];
        onChange(newValues);
      } else {
        onChange(selectedValue);
        setOpen(false);
      }
      setSearchQuery('');
    },
    [multiple, selectedValues, onChange, tags, incrementUsage]
  );

  // Handle creating new tag
  const handleCreateNew = useCallback(async () => {
    if (!searchQuery.trim()) return;

    const newTag = await createTagInline(category, searchQuery.trim(), selectedColor || undefined);
    if (newTag) {
      handleSelect(newTag.value);
    }
    setSelectedColor('');
    setShowColorPicker(false);
  }, [searchQuery, category, createTagInline, handleSelect, selectedColor]);

  // Handle removing a value (for multiple mode)
  const handleRemove = useCallback(
    (val: string) => {
      if (multiple) {
        onChange(selectedValues.filter(v => v !== val));
      } else {
        onChange('');
      }
    },
    [multiple, selectedValues, onChange]
  );

  // Render selected values
  const renderSelectedValues = () => {
    if (selectedValues.length === 0) {
      return <span className="text-muted-foreground">{placeholder}</span>;
    }

    if (multiple) {
      return (
        <div className="flex flex-wrap gap-1">
          {selectedValues.map(val => {
            const color = getTagColor(val);
            return (
              <Badge
                key={val}
                variant="secondary"
                className="flex items-center gap-1"
                style={color ? { backgroundColor: color, color: '#fff' } : undefined}
              >
                {getDisplayLabel(val)}
                <X
                  className="h-3 w-3 cursor-pointer hover:opacity-70"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(val);
                  }}
                />
              </Badge>
            );
          })}
        </div>
      );
    }

    const color = getTagColor(selectedValues[0]);
    return (
      <Badge
        variant="secondary"
        className="font-normal"
        style={color ? { backgroundColor: color, color: '#fff' } : undefined}
      >
        {getDisplayLabel(selectedValues[0])}
      </Badge>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn(
            'w-full justify-between text-right min-h-[40px] h-auto',
            className
          )}
        >
          {renderSelectedValues()}
          <ChevronsUpDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="חפש או הקלד..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="text-right"
          />
          <CommandList>
            <CommandEmpty>
              {canCreateNew ? (
                <div className="py-2 px-3 text-sm text-right">
                  לא נמצאו תוצאות
                </div>
              ) : (
                <div className="py-2 px-3 text-sm text-muted-foreground text-right">
                  {loading ? 'טוען...' : 'לא נמצאו תגיות'}
                </div>
              )}
            </CommandEmpty>

            {/* Create new option */}
            {canCreateNew && (
              <CommandGroup>
                <div className="px-2 py-2 space-y-2">
                  <div className="flex items-center gap-2">
                    {selectedColor && (
                      <div
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: selectedColor }}
                      />
                    )}
                    <span className="text-sm">הוסף: "{searchQuery}"</span>
                  </div>

                  {/* Color picker */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedColor('')}
                      className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center text-[10px]",
                        !selectedColor ? "border-primary ring-1 ring-primary" : "border-gray-300"
                      )}
                      title="ללא צבע"
                    >
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                    {QUICK_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={cn(
                          "w-5 h-5 rounded border-2",
                          selectedColor === color ? "border-primary scale-110" : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>

                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleCreateNew}
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    הוסף תגית
                  </Button>
                </div>
              </CommandGroup>
            )}

            {/* Existing tags */}
            {filteredTags.length > 0 && (
              <CommandGroup>
                {filteredTags.map(tag => {
                  const isSelected = selectedValues.includes(tag.value);
                  return (
                    <CommandItem
                      key={tag.id}
                      value={tag.value}
                      onSelect={() => handleSelect(tag.value)}
                      className="flex justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {tag.color && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                        )}
                        <span>{tag.label}</span>
                        {tag.description && (
                          <span className="text-xs text-muted-foreground">
                            ({tag.description})
                          </span>
                        )}
                      </div>
                      <Check
                        className={cn(
                          'h-4 w-4',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
