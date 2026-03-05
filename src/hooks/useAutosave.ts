import { useCallback, useEffect, useRef } from 'react';
import { authenticatedFetch } from '../lib/api/apiHelpers';

/** Payload shape returned by `getPayload` (matches what the server expects). */
export interface AutosavePayload {
  title: string;
  content: string;
  editGroups: string[];
  viewGroups: string[];
  path: string;
}

interface AutosaveOptions {
  pageId?: number;
  title: string;
  content: string;
  editGroups: string[];
  viewGroups: string[];
  path: string;
  enabled: boolean;
  /**
   * When supplied, the autosave will call this at save-time to obtain the
   * payload (e.g. read from localStorage).  Falls back to the closure values
   * when not provided or when it returns `null`.
   */
  getPayload?: () => AutosavePayload | null;
  onSaveSuccess?: (data: { id: number; version: number; saved_at: string; is_draft: boolean; no_change?: boolean }) => void;
  onSaveError?: (error: string) => void;
  /** Called when a save attempt fails due to a network error (e.g. offline). */
  onNetworkError?: (error: string) => void;
  /** Called when a save succeeds (so caller can clear the local draft). */
  onSynced?: () => void;
}

export function useAutosave({
  pageId,
  title,
  content,
  editGroups,
  viewGroups,
  path,
  enabled,
  getPayload,
  onSaveSuccess,
  onSaveError,
  onNetworkError,
  onSynced,
}: AutosaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastSavedRef = useRef<string>('');
  const isSavingRef = useRef(false);

  const performAutosave = useCallback(async (isManual = false) => {
    if (!pageId || !enabled || isSavingRef.current) {
      return;
    }

    // Resolve the payload – prefer getPayload() (reads from localStorage),
    // fall back to the closure-captured React state values.
    const externalPayload = getPayload?.() ?? null;
    const saveTitle = externalPayload?.title ?? title;
    const saveContent = externalPayload?.content ?? content;
    const savePath = externalPayload?.path ?? path;
    const saveEditGroups = externalPayload?.editGroups ?? editGroups;
    const saveViewGroups = externalPayload?.viewGroups ?? viewGroups;

    // Create a hash of the current content to check if it's changed
    const currentHash = JSON.stringify({
      title: saveTitle,
      content: saveContent,
      path: savePath,
      editGroups: saveEditGroups,
      viewGroups: saveViewGroups,
    });
    
    // Don't save if content hasn't changed
    if (currentHash === lastSavedRef.current) {
      // Content matches the last successful server save — we're in sync.
      // Signal this so any offline flag can be cleared (e.g. server came back
      // but no new content was typed since the last successful save).
      if (onSynced) onSynced();
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
    if (!saveTitle.trim() || saveContent.length < 10) {
      return;
    }

    isSavingRef.current = true;

    try {
      const response = await authenticatedFetch(`/api/pages/${pageId}/autosave`, {
        method: 'POST',
        body: JSON.stringify({
          title: saveTitle,
          content: saveContent,
          edit_groups: saveEditGroups,
          view_groups: saveViewGroups,
          path: savePath,
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
      
      if (onSynced) onSynced();
      if (onSaveSuccess) {
        onSaveSuccess(data);
      }
    } catch (error) {
      // Distinguish network errors (offline / DNS / connection refused) from
      // server-side errors.  `TypeError: Failed to fetch` is what the Fetch
      // API throws when the request cannot be sent at all.
      const msg = error instanceof Error ? error.message : 'Autosave failed';
      const isNetworkError =
        error instanceof TypeError && /failed to fetch|networkerror|network request failed/i.test(msg);

      if (isNetworkError && onNetworkError) {
        onNetworkError(msg);
      } else if (onSaveError) {
        onSaveError(msg);
      }
    } finally {
      isSavingRef.current = false;
    }
  }, [pageId, title, content, editGroups, viewGroups, path, enabled, getPayload, onSaveSuccess, onSaveError, onNetworkError, onSynced]);

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
        // Prefer localStorage-backed payload if available
        const externalPayload = getPayload?.() ?? null;
        const payload = JSON.stringify({
          title: externalPayload?.title ?? title,
          content: externalPayload?.content ?? content,
          edit_groups: externalPayload?.editGroups ?? editGroups,
          view_groups: externalPayload?.viewGroups ?? viewGroups,
          path: externalPayload?.path ?? path,
        });
        
        navigator.sendBeacon(`/api/pages/${pageId}/autosave`, payload);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pageId, title, content, editGroups, viewGroups, path, enabled, getPayload]);

  return {
    saveNow,
    deleteDraft,
    isSaving: isSavingRef.current
  };
}
