import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';
import { useToast } from '@/hooks/use-toast';
import { Tag, TagCategory, TagInsert, TagUpdate } from '@/types/tags';

export const useTags = (category?: TagCategory) => {
  const { clinicId } = useClinic();
  const { toast } = useToast();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch tags - optionally filtered by category
  const fetchTags = useCallback(async () => {
    if (!clinicId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('tags')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('usage_count', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTags((data as Tag[]) || []);
    } catch (error: any) {
      console.error('Error fetching tags:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בטעינת תגיות',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [clinicId, category, toast]);

  // Initial fetch
  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Create a new tag
  const createTag = useCallback(async (tagData: TagInsert): Promise<Tag | null> => {
    if (!clinicId) return null;

    try {
      // Generate value from label if not provided
      const value = tagData.value || tagData.label.toLowerCase().replace(/\s+/g, '_');

      const insertData = {
        clinic_id: clinicId,
        category: tagData.category,
        value,
        label: tagData.label,
        description: tagData.description || null,
        color: tagData.color || null,
        is_active: tagData.is_active ?? true,
        sort_order: tagData.sort_order ?? 0,
      };

      const { data, error } = await supabase
        .from('tags')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      const newTag = data as Tag;

      // Only add to local state if it matches current category filter
      if (!category || newTag.category === category) {
        setTags(prev => [...prev, newTag].sort((a, b) => {
          if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
          return b.usage_count - a.usage_count;
        }));
      }

      toast({
        title: 'הצלחה',
        description: 'התגית נוצרה בהצלחה',
      });

      return newTag;
    } catch (error: any) {
      console.error('Error creating tag:', error);
      // Check for unique constraint violation
      if (error.code === '23505') {
        toast({
          title: 'שגיאה',
          description: 'תגית עם ערך זה כבר קיימת',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'שגיאה',
          description: error.message || 'שגיאה ביצירת תגית',
          variant: 'destructive',
        });
      }
      return null;
    }
  }, [clinicId, category, toast]);

  // Create tag inline (used by TagInput for quick creation)
  const createTagInline = useCallback(async (
    tagCategory: TagCategory,
    label: string,
    color?: string
  ): Promise<Tag | null> => {
    return createTag({
      category: tagCategory,
      value: label.toLowerCase().replace(/\s+/g, '_'),
      label,
      color,
    });
  }, [createTag]);

  // Update a tag
  const updateTag = useCallback(async (tagId: string, updates: TagUpdate): Promise<boolean> => {
    try {
      const updateData: any = {};
      if (updates.value !== undefined) updateData.value = updates.value;
      if (updates.label !== undefined) updateData.label = updates.label;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
      if (updates.sort_order !== undefined) updateData.sort_order = updates.sort_order;

      const { error } = await supabase
        .from('tags')
        .update(updateData)
        .eq('id', tagId);

      if (error) throw error;

      setTags(prev => prev.map(tag =>
        tag.id === tagId ? { ...tag, ...updateData } : tag
      ));

      toast({
        title: 'הצלחה',
        description: 'התגית עודכנה בהצלחה',
      });

      return true;
    } catch (error: any) {
      console.error('Error updating tag:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'שגיאה בעדכון תגית',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // Delete a tag (soft delete)
  const deleteTag = useCallback(async (tagId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('tags')
        .update({ is_active: false })
        .eq('id', tagId);

      if (error) throw error;

      setTags(prev => prev.filter(tag => tag.id !== tagId));

      toast({
        title: 'הצלחה',
        description: 'התגית נמחקה בהצלחה',
      });

      return true;
    } catch (error: any) {
      console.error('Error deleting tag:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'שגיאה במחיקת תגית',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // Increment tag usage count
  const incrementUsage = useCallback(async (tagId: string): Promise<void> => {
    try {
      await supabase.rpc('increment_tag_usage', { tag_id: tagId });

      // Update local state
      setTags(prev => prev.map(tag =>
        tag.id === tagId ? { ...tag, usage_count: tag.usage_count + 1 } : tag
      ));
    } catch (error) {
      // Silent fail - usage tracking is not critical
      console.error('Error incrementing tag usage:', error);
    }
  }, []);

  // Get tag by value (useful for looking up existing data)
  const getTagByValue = useCallback((value: string): Tag | undefined => {
    return tags.find(t => t.value === value);
  }, [tags]);

  // Get tag label by value (with fallback to value itself)
  const getTagLabel = useCallback((value: string): string => {
    const tag = tags.find(t => t.value === value);
    return tag?.label || value;
  }, [tags]);

  return {
    tags,
    loading,
    fetchTags,
    createTag,
    createTagInline,
    updateTag,
    deleteTag,
    incrementUsage,
    getTagByValue,
    getTagLabel,
  };
};

// Helper hook to get tags for a specific category
export const useTagsByCategory = (category: TagCategory) => {
  return useTags(category);
};
