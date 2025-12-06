import { useEffect, useRef, useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';

interface UseVisitAutoSaveOptions {
  visitId?: string;
  clinicId: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formMethods: UseFormReturn<any>;
  debounceMs?: number;
  enabled?: boolean;
}

// localStorage key for draft backup
const DRAFT_STORAGE_KEY = 'visit_draft_backup';

// Save draft to localStorage immediately (synchronous backup)
const saveDraftToLocalStorage = (clinicId: string, visitId: string, data: Record<string, unknown>) => {
  try {
    const draft = {
      clinicId,
      visitId,
      data,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Silent failure for localStorage
  }
};

// Load draft from localStorage
export const loadDraftFromLocalStorage = (clinicId: string): { visitId: string; data: Record<string, unknown> } | null => {
  try {
    const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!stored) return null;

    const draft = JSON.parse(stored);

    // Check if draft is for this clinic and not too old (24 hours)
    if (draft.clinicId !== clinicId) return null;

    const savedAt = new Date(draft.savedAt);
    const hoursSinceSave = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceSave > 24) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      return null;
    }

    return { visitId: draft.visitId, data: draft.data };
  } catch {
    return null;
  }
};

// Clear draft from localStorage
export const clearDraftFromLocalStorage = () => {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Silent failure
  }
};

// Fields that can be auto-saved (must match actual visits table columns)
const AUTO_SAVE_FIELDS = [
  'client_id',
  'pet_id',
  'visit_type',
  'visit_date',
  'chief_complaint',
  'history',
  'general_history',
  'medical_history',
  'current_history',
  'physical_exam',
  'additional_tests',
  'diagnoses',
  'treatments',
  'medications',
  'recommendations',
  'client_summary',
  'status',
  // Note: vaccination_type and vaccination_date are form-only fields, not DB columns
];

export const useVisitAutoSave = ({
  visitId,
  clinicId,
  formMethods,
  debounceMs = 2000,
  enabled = true,
}: UseVisitAutoSaveOptions) => {
  const { watch } = formMethods;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const lastSavedDataRef = useRef<string>('');

  const autoSave = useCallback(async (data: Record<string, unknown>) => {
    if (!visitId || !clinicId) {
      return;
    }

    // Build update object with only auto-save fields
    const updateData: Record<string, unknown> = {};
    for (const field of AUTO_SAVE_FIELDS) {
      if (field in data) {
        const value = data[field];
        // Convert empty strings to null for optional fields
        updateData[field] = value === '' ? null : value;
      }
    }

    // Don't save if nothing to update
    if (Object.keys(updateData).length === 0) {
      return;
    }

    // Check if data actually changed
    const dataString = JSON.stringify(updateData);
    if (dataString === lastSavedDataRef.current) {
      return;
    }

    // FIRST: Save to localStorage immediately (synchronous - survives navigation)
    saveDraftToLocalStorage(clinicId, visitId, updateData);

    // Skip database save if already saving
    if (isSavingRef.current) {
      return;
    }

    try {
      isSavingRef.current = true;

      const { error } = await supabase
        .from('visits')
        .update(updateData)
        .eq('id', visitId);

      if (!error) {
        lastSavedDataRef.current = dataString;
        // Clear localStorage backup after successful DB save
        clearDraftFromLocalStorage();
      }
      // Silent failure - no toast for auto-save errors
    } catch {
      // Silent failure - localStorage backup still exists
    } finally {
      isSavingRef.current = false;
    }
  }, [visitId, clinicId]);

  // Helper to save to localStorage immediately (no debounce)
  const saveToLocalStorageNow = useCallback((data: Record<string, unknown>) => {
    if (!visitId || !clinicId) return;

    const updateData: Record<string, unknown> = {};
    for (const field of AUTO_SAVE_FIELDS) {
      if (field in data) {
        const value = data[field];
        updateData[field] = value === '' ? null : value;
      }
    }

    if (Object.keys(updateData).length > 0) {
      saveDraftToLocalStorage(clinicId, visitId, updateData);
    }
  }, [visitId, clinicId]);

  useEffect(() => {
    if (!enabled || !visitId || !clinicId) {
      return;
    }

    const subscription = watch((data) => {
      // Save to localStorage IMMEDIATELY (survives navigation)
      saveToLocalStorageNow(data as Record<string, unknown>);

      // Clear existing timeout for debounced DB save
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set debounced save to database
      timeoutRef.current = setTimeout(() => {
        autoSave(data as Record<string, unknown>);
      }, debounceMs);
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [watch, autoSave, saveToLocalStorageNow, debounceMs, enabled, visitId, clinicId]);

  // Save immediately when unmounting
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Get current form data and save to localStorage (sync) and trigger DB save
      const currentData = formMethods.getValues();
      saveToLocalStorageNow(currentData);
      autoSave(currentData);
    };
  }, [autoSave, saveToLocalStorageNow, formMethods]);

  return {
    isSaving: isSavingRef.current,
  };
};
