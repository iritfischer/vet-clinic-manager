import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tags, Plus, Pencil, Trash2, Loader2, Search } from 'lucide-react';
import { useTags } from '@/hooks/useTags';
import { useClinic } from '@/hooks/useClinic';
import { supabase } from '@/integrations/supabase/client';
import { Tag, TagCategory, TAG_CATEGORIES, TAG_CATEGORY_LABELS, TagInsert } from '@/types/tags';

// Color presets for tags
const COLOR_PRESETS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
];

interface TagFormData {
  label: string;
  value: string;
  description: string;
  color: string;
}

export const TagManagement = () => {
  const [activeCategory, setActiveCategory] = useState<TagCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { clinicId } = useClinic();

  // When 'all' is selected, we still need a category for useTags hook
  const categoryToFetch = activeCategory === 'all' ? 'visit_type' : activeCategory;
  const { tags: categoryTags, loading, createTag, updateTag, deleteTag } = useTags(categoryToFetch as TagCategory);

  // For "all" category, we need to fetch all tags
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);

  // Fetch all tags
  const fetchAllTags = async () => {
    if (!clinicId) return;
    setLoadingAll(true);
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .order('category')
        .order('sort_order');

      if (!error && data) {
        setAllTags(data as Tag[]);
      }
    } finally {
      setLoadingAll(false);
    }
  };

  // Fetch all tags when component mounts or when switching to "all"
  useEffect(() => {
    if (activeCategory === 'all' && clinicId) {
      fetchAllTags();
    }
  }, [activeCategory, clinicId]);

  // Get the tags to display based on category
  const baseTags = activeCategory === 'all' ? allTags : categoryTags;

  // Filter tags by search query
  const tags = baseTags.filter(tag => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      tag.label.toLowerCase().includes(query) ||
      tag.value.toLowerCase().includes(query) ||
      tag.description?.toLowerCase().includes(query)
    );
  });

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<TagFormData>({
    label: '',
    value: '',
    description: '',
    color: '',
  });

  // Handle category change
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category as TagCategory | 'all');
  };

  // Open dialog for new tag
  const handleAddNew = () => {
    setEditingTag(null);
    setFormData({ label: '', value: '', description: '', color: '' });
    setDialogOpen(true);
  };

  // Open dialog for editing
  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({
      label: tag.label,
      value: tag.value,
      description: tag.description || '',
      color: tag.color || '',
    });
    setDialogOpen(true);
  };

  // Handle delete
  const handleDeleteClick = (tag: Tag) => {
    setTagToDelete(tag);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!tagToDelete) return;
    await deleteTag(tagToDelete.id);
    setDeleteConfirmOpen(false);
    setTagToDelete(null);
  };

  // Save tag (create or update)
  const handleSave = async () => {
    if (!formData.label.trim()) return;

    setSaving(true);
    try {
      if (editingTag) {
        // Update existing
        await updateTag(editingTag.id, {
          label: formData.label.trim(),
          value: formData.value.trim() || formData.label.toLowerCase().replace(/\s+/g, '_'),
          description: formData.description.trim() || undefined,
          color: formData.color || undefined,
        });
      } else {
        // Create new
        const tagData: TagInsert = {
          category: activeCategory,
          label: formData.label.trim(),
          value: formData.value.trim() || formData.label.toLowerCase().replace(/\s+/g, '_'),
          description: formData.description.trim() || undefined,
          color: formData.color || undefined,
        };
        await createTag(tagData);
      }
      setDialogOpen(false);
      setFormData({ label: '', value: '', description: '', color: '' });
    } finally {
      setSaving(false);
    }
  };

  // Auto-generate value from label
  const handleLabelChange = (label: string) => {
    setFormData(prev => ({
      ...prev,
      label,
      value: editingTag ? prev.value : label.toLowerCase().replace(/\s+/g, '_'),
    }));
  };

  return (
    <Card dir="rtl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Tags className="h-6 w-6 text-purple-600" />
          </div>
          <div className="text-right">
            <CardTitle>ניהול תגיות</CardTitle>
            <CardDescription>
              נהל את התגיות והקטגוריות עבור ביקורים, אבחנות, טיפולים ועוד
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter row */}
        <div className="flex items-center gap-4 justify-end flex-wrap">
          <Button onClick={handleAddNew} size="sm">
            <Plus className="h-4 w-4 ml-2" />
            הוסף תגית
          </Button>

          <div className="flex items-center gap-2">
            <Select value={activeCategory} onValueChange={handleCategoryChange} dir="rtl">
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הקטגוריות</SelectItem>
                {Object.entries(TAG_CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label className="text-sm whitespace-nowrap">קטגוריה:</Label>
          </div>

          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש תגית..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 text-right"
            />
          </div>
        </div>

        {/* Tags table */}
        {(loading || loadingAll) ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tags.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'לא נמצאו תגיות התואמות לחיפוש' : 'אין תגיות בקטגוריה זו. לחץ על "הוסף תגית" כדי להתחיל.'}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right w-[80px]">פעולות</TableHead>
                  <TableHead className="text-right w-[80px]">שימושים</TableHead>
                  <TableHead className="text-right">צבע</TableHead>
                  <TableHead className="text-right">תיאור</TableHead>
                  <TableHead className="text-right">ערך</TableHead>
                  {activeCategory === 'all' && (
                    <TableHead className="text-right">קטגוריה</TableHead>
                  )}
                  <TableHead className="text-right">תווית</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(tag)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(tag)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{tag.usage_count}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {tag.color ? (
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-xs text-muted-foreground font-mono">
                            {tag.color}
                          </span>
                          <div
                            className="w-5 h-5 rounded border"
                            style={{ backgroundColor: tag.color }}
                          />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm text-right">
                      {tag.description || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono text-right" dir="ltr">
                      {tag.value}
                    </TableCell>
                    {activeCategory === 'all' && (
                      <TableCell className="text-right">
                        <Badge variant="outline">
                          {TAG_CATEGORY_LABELS[tag.category as TagCategory]}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="font-medium text-right">{tag.label}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTag ? 'עריכת תגית' : 'הוספת תגית חדשה'}
            </DialogTitle>
            <DialogDescription>
              {editingTag
                ? 'ערוך את פרטי התגית'
                : `הוסף תגית חדשה לקטגוריית ${TAG_CATEGORY_LABELS[activeCategory]}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2 text-right">
              <Label htmlFor="tag-label">תווית (שם התצוגה) *</Label>
              <Input
                id="tag-label"
                placeholder="לדוגמה: בדיקה שגרתית"
                value={formData.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                className="text-right"
              />
            </div>

            <div className="space-y-2 text-right">
              <Label htmlFor="tag-value">ערך (מזהה פנימי)</Label>
              <Input
                id="tag-value"
                placeholder="נוצר אוטומטית מהתווית"
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                dir="ltr"
                className="font-mono text-sm text-left"
              />
              <p className="text-xs text-muted-foreground text-right">
                משמש לזיהוי פנימי. השאר ריק ליצירה אוטומטית
              </p>
            </div>

            <div className="space-y-2 text-right">
              <Label htmlFor="tag-description">תיאור (אופציונלי)</Label>
              <Input
                id="tag-description"
                placeholder="תיאור קצר של התגית"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="text-right"
              />
            </div>

            <div className="space-y-2 text-right">
              <Label>צבע (אופציונלי)</Label>
              <div className="flex flex-wrap gap-2 flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color: '' }))}
                  className={`w-8 h-8 rounded border-2 ${
                    !formData.color ? 'border-primary' : 'border-gray-200'
                  } bg-white flex items-center justify-center text-xs text-muted-foreground`}
                >
                  ✕
                </button>
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded border-2 ${
                      formData.color === color ? 'border-primary scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2 flex-row-reverse">
                {formData.color && (
                  <div
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: formData.color }}
                  />
                )}
                <Input
                  placeholder="#000000"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  dir="ltr"
                  className="font-mono text-sm w-32 text-left"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 flex-row-reverse sm:flex-row-reverse">
            <Button onClick={handleSave} disabled={!formData.label.trim() || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingTag ? 'שמור' : 'הוסף'}
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>מחיקת תגית</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              האם למחוק את התגית "{tagToDelete?.label}"?
              <br />
              פעולה זו לא תשפיע על רשומות קיימות שמשתמשות בתגית זו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 flex-row-reverse sm:flex-row-reverse">
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחק
            </AlertDialogAction>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
