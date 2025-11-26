import { useEffect, useState } from 'react';
import { authenticatedFetch } from '../lib/api/apiHelpers';

interface DraftStatus {
  hasDraft: boolean;
  draftSavedAt?: string;
  loading: boolean;
}

export function useDraftStatus(pageId: number | undefined, enabled: boolean = true): DraftStatus {
  const [status, setStatus] = useState<DraftStatus>({ hasDraft: false, loading: false });

  useEffect(() => {
    if (!pageId || !enabled) {
      setStatus({ hasDraft: false, loading: false });
      return;
    }

    setStatus(prev => ({ ...prev, loading: true }));

    authenticatedFetch(`/api/pages/${pageId}/autosave`)
      .then(res => {
        if (res.ok) {
          return res.json();
        }
        throw new Error('Failed to check draft status');
      })
      .then(data => {
        setStatus({
          hasDraft: data.is_draft === true,
          draftSavedAt: data.is_draft ? data.updated_at : undefined,
          loading: false
        });
      })
      .catch(() => {
        setStatus({ hasDraft: false, loading: false });
      });
  }, [pageId, enabled]);

  return status;
}
