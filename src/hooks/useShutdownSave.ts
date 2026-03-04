'use client';

import { useEffect, useRef, useState } from 'react';

interface ShutdownSaveOptions {
  /** DB page id — required to build the autosave URL */
  pageId: number | undefined;
  title: string;
  content: string;
  editGroups: string[];
  viewGroups: string[];
  path: string;
  /** Set to false to disable (e.g. page not yet saved / create mode) */
  enabled?: boolean;
}

interface ShutdownSaveResult {
  /** True while the "Server restarting, saving…" banner should be visible */
  shutdownBannerVisible: boolean;
}

/**
 * Subscribes to the server's SSE shutdown stream.
 * When the server broadcasts a "shutdown" event, this hook fires a
 * `navigator.sendBeacon` autosave so unsaved changes are persisted even if
 * the user doesn't interact before the process exits.
 *
 * Only active while `enabled` is true and `pageId` is defined.
 */
export function useShutdownSave({
  pageId,
  title,
  content,
  editGroups,
  viewGroups,
  path,
  enabled = true,
}: ShutdownSaveOptions): ShutdownSaveResult {
  const [shutdownBannerVisible, setShutdownBannerVisible] = useState(false);

  // Keep beacon payload refs up-to-date without re-subscribing the EventSource
  const payloadRef = useRef({ title, content, editGroups, viewGroups, path });
  useEffect(() => {
    payloadRef.current = { title, content, editGroups, viewGroups, path };
  }, [title, content, editGroups, viewGroups, path]);

  const pageIdRef = useRef(pageId);
  useEffect(() => { pageIdRef.current = pageId; }, [pageId]);

  useEffect(() => {
    if (!enabled || !pageId) return;

    const es = new EventSource('/api/events/stream');

    es.addEventListener('shutdown', () => {
      const id = pageIdRef.current;
      if (!id) return;

      const { title, content, editGroups, viewGroups, path } = payloadRef.current;

      // Fire a fire-and-forget beacon; sendBeacon is the most reliable API
      // during page/process teardown — it sends with cookies by default.
      const blob = new Blob(
        [JSON.stringify({ title, content, edit_groups: editGroups, view_groups: viewGroups, path })],
        { type: 'application/json' }
      );
      navigator.sendBeacon(`/api/pages/${id}/autosave`, blob);

      setShutdownBannerVisible(true);
      // Auto-hide after 8 s in case the server doesn't actually go away
      setTimeout(() => setShutdownBannerVisible(false), 8_000);
    });

    return () => {
      es.close();
    };
  // Only re-subscribe if pageId or enabled changes — payload is accessed via refs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, enabled]);

  return { shutdownBannerVisible };
}
