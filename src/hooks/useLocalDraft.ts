'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Shape of the draft payload stored in localStorage */
export interface LocalDraftPayload {
  title: string;
  content: string;
  path: string;
  editGroups: string[];
  viewGroups: string[];
  savedAt: string; // ISO 8601
  lockShortId: string | null;
}

interface UseLocalDraftOptions {
  /** DB page id. Pass `undefined` for create-mode (uses key "page-draft-new"). */
  pageId?: number;
  title: string;
  content: string;
  path: string;
  editGroups: string[];
  viewGroups: string[];
  lockShortId?: string;
  /** Debounce delay in ms before writing to localStorage (default 1000) */
  debounceMs?: number;
  /** Set to false to disable writes (e.g. while loading) */
  enabled?: boolean;
}

interface UseLocalDraftReturn {
  /** Read the current draft from localStorage (call at save-time). */
  readDraft: () => LocalDraftPayload | null;
  /** Remove the draft from localStorage (call after successful server save). */
  clearDraft: () => void;
  /** Whether the browser reports no network connectivity OR the last server save failed with a network error. */
  isOffline: boolean;
  /** Signal from the autosave hook that a server save failed due to a network error. */
  markOffline: () => void;
  /** Signal that a server save succeeded (resets the network-error offline flag). */
  markOnline: () => void;
}

function storageKey(pageId?: number): string {
  return pageId != null ? `page-draft-${pageId}` : 'page-draft-new';
}

/**
 * Continuously mirrors editor state into localStorage with a debounce.
 *
 * Also tracks online/offline status via both `navigator.onLine` and an
 * imperative `markOffline()` / `markOnline()` API that the autosave hook
 * can call when fetch requests fail or succeed.
 */
export function useLocalDraft({
  pageId,
  title,
  content,
  path,
  editGroups,
  viewGroups,
  lockShortId,
  debounceMs = 1000,
  enabled = true,
}: UseLocalDraftOptions): UseLocalDraftReturn {
  // ── Online / offline tracking ────────────────────────────────────────
  const [browserOffline, setBrowserOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );
  const [fetchOffline, setFetchOffline] = useState(false);

  useEffect(() => {
    const goOffline = () => setBrowserOffline(true);
    const goOnline = () => {
      setBrowserOffline(false);
      setFetchOffline(false); // browser is back, optimistic reset
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  const isOffline = browserOffline || fetchOffline;

  const markOffline = useCallback(() => setFetchOffline(true), []);
  const markOnline = useCallback(() => setFetchOffline(false), []);

  // ── Debounced localStorage writes ────────────────────────────────────
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Keep latest values in refs so the write callback always has fresh data
  // without re-creating the timer on every keystroke.
  const latestRef = useRef({ title, content, path, editGroups, viewGroups, lockShortId });
  useEffect(() => {
    latestRef.current = { title, content, path, editGroups, viewGroups, lockShortId };
  }, [title, content, path, editGroups, viewGroups, lockShortId]);

  const pageIdRef = useRef(pageId);
  useEffect(() => {
    pageIdRef.current = pageId;
  }, [pageId]);

  // Schedule a debounced write whenever any tracked value changes.
  useEffect(() => {
    if (!enabled) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const { title, content, path, editGroups, viewGroups, lockShortId } = latestRef.current;
      // Don't write truly empty drafts
      if (!title && !content) return;

      const payload: LocalDraftPayload = {
        title,
        content,
        path,
        editGroups,
        viewGroups,
        savedAt: new Date().toISOString(),
        lockShortId: lockShortId ?? null,
      };

      try {
        localStorage.setItem(storageKey(pageIdRef.current), JSON.stringify(payload));
      } catch (e) {
        // Storage full or unavailable — fail silently
        console.warn('[useLocalDraft] localStorage write failed', e);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // We intentionally depend on the primitive values so the debounce
    // restarts whenever the user types. The refs ensure the written payload
    // always reflects the latest state even if the timeout fires late.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, path, JSON.stringify(editGroups), JSON.stringify(viewGroups), lockShortId, enabled, debounceMs]);

  // ── Read / clear ─────────────────────────────────────────────────────
  const readDraft = useCallback((): LocalDraftPayload | null => {
    try {
      const raw = localStorage.getItem(storageKey(pageIdRef.current));
      if (!raw) return null;
      return JSON.parse(raw) as LocalDraftPayload;
    } catch {
      return null;
    }
  }, []);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey(pageIdRef.current));
    } catch {
      // ignore
    }
  }, []);

  return { readDraft, clearDraft, isOffline, markOffline, markOnline };
}
