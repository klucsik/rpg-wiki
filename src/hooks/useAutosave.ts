import { useCallback, useEffect, useRef } from 'react';
import { authenticatedFetch } from '../lib/api/apiHelpers';

interface AutosaveOptions {
  pageId?: number;
  title: string;
  content: string;
  editGroups: string[];
  viewGroups: string[];
  path: string;
  enabled: boolean;
  onSaveSuccess?: (data: { id: number; version: number; saved_at: string; is_draft: boolean; no_change?: boolean }) => void;
  onSaveError?: (error: string) => void;
}

export function useAutosave({
  pageId,
  title,
  content,
  editGroups,
  viewGroups,
  path,
  enabled,
  onSaveSuccess,
  onSaveError
}: AutosaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastSavedRef = useRef<string>('');
  const isSavingRef = useRef(false);

  const performAutosave = useCallback(async (isManual = false) => {
    if (!pageId || !enabled || isSavingRef.current) {
      return;
    }

    // Create a hash of the current content to check if it's changed
    const currentHash = JSON.stringify({ title, content, path, editGroups, viewGroups });
    
    // Don't save if content hasn't changed
    if (currentHash === lastSavedRef.current) {
      // For manual saves, notify user that no changes were detected
      if (isManual && onSaveSuccess) {
        onSaveSuccess({
          id: pageId,
          version: 0,
          saved_at: new Date().toISOString(),
          is_draft: true,
          no_change: true
        });
      }
      return;
    }

    // Don't save if content is empty/too short
    if (!title.trim() || content.length < 10) {
      return;
    }

    isSavingRef.current = true;

    try {
      const response = await authenticatedFetch(`/api/pages/${pageId}/autosave`, {
        method: 'POST',
        body: JSON.stringify({
          title,
          content,
          edit_groups: editGroups,
          view_groups: viewGroups,
          path
        })
      });

      if (!response.ok) {
        throw new Error('Autosave failed');
      }

      const data = await response.json();
      
      // Handle no-change responses gracefully
      if (data.no_change) {
        // Update our tracking to prevent repeated save attempts
        lastSavedRef.current = currentHash;
        return; // Don't call onSaveSuccess for no-change responses
      }
      
      lastSavedRef.current = currentHash;
      
      if (onSaveSuccess) {
        onSaveSuccess(data);
      }
    } catch (error) {
      if (onSaveError) {
        onSaveError(error instanceof Error ? error.message : 'Autosave failed');
      }
    } finally {
      isSavingRef.current = false;
    }
  }, [pageId, title, content, editGroups, viewGroups, path, enabled, onSaveSuccess, onSaveError]);

  // Debounced autosave effect
  useEffect(() => {
    if (!enabled || !pageId) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for autosave (30 seconds delay)
    timeoutRef.current = setTimeout(() => {
      performAutosave(false);
    }, 30000);

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [performAutosave, enabled, pageId]);

  // Manual save function
  const saveNow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    performAutosave(true);
  }, [performAutosave]);

  // Delete draft function
  const deleteDraft = useCallback(async () => {
    if (!pageId || !enabled) {
      throw new Error('No page ID available');
    }

    try {
      const response = await authenticatedFetch(`/api/pages/${pageId}/autosave`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete draft');
      }

      // Reset the last saved reference since draft is deleted
      lastSavedRef.current = '';
      
      return await response.json();
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to delete draft');
    }
  }, [pageId, enabled]);

  // Force save when user leaves page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (enabled && pageId) {
        // Use sendBeacon for reliable sending when page is closing
        const payload = JSON.stringify({
          title,
          content,
          edit_groups: editGroups,
          view_groups: viewGroups,
          path
        });
        
        navigator.sendBeacon(`/api/pages/${pageId}/autosave`, payload);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pageId, title, content, editGroups, viewGroups, path, enabled]);

  return {
    saveNow,
    deleteDraft,
    isSaving: isSavingRef.current
  };
}
