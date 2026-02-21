"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { PageEditor } from "../../../../components/editor";
import EditLockWarning, { EditLock } from "../../../../components/editor/EditLockWarning";
import { WikiPage } from "../../../../types";
import { useUser, canUserEditPage, isUserAuthenticated } from "../../../../features/auth";

export default function EditPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: userLoading } = useUser();
  const id = params?.id as string;
  const [page, setPage] = useState<WikiPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit-lock state
  const [lockChecked, setLockChecked] = useState(false);
  const [existingLocks, setExistingLocks] = useState<EditLock[]>([]);
  const [showLockWarning, setShowLockWarning] = useState(false);
  const [lockAcquired, setLockAcquired] = useState(false);
  const [myLockShortId, setMyLockShortId] = useState<string | null>(null);
  // Numeric DB id of our specific lock – used to release only our own lock
  const myLockIdRef = useRef<number | null>(null);

  const STORAGE_KEY = `editlock-page-${id}`;

  const hasRedirected = useRef(false);
  const lockReleasedRef = useRef(false);
  // Prevents the lock-check effect from firing twice (React Strict Mode / concurrent renders)
  const lockCheckStartedRef = useRef(false);

  // Acquire a fresh edit lock and persist its ID in sessionStorage
  const acquireLock = useCallback(async () => {
    try {
      const res = await fetch(`/api/pages/${id}/edit-locks`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const lock = data.lock;
        myLockIdRef.current = lock?.id ?? null;
        setMyLockShortId(lock?.short_id ?? null);
        if (lock?.id) {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id: lock.id, short_id: lock.short_id }));
        }
      }
      setLockAcquired(true);
    } catch {
      setLockAcquired(true);
    }
  }, [id, STORAGE_KEY]);

  // Re-adopt a lock that already exists in the DB (e.g. after a page refresh)
  const reAdoptLock = useCallback((lock: EditLock) => {
    myLockIdRef.current = lock.id;
    setMyLockShortId(lock.short_id);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id: lock.id, short_id: lock.short_id }));
    setLockAcquired(true);
  }, [STORAGE_KEY]);

  // Release only OUR specific lock by its DB id
  const releaseLock = useCallback(async () => {
    if (lockReleasedRef.current) return;
    lockReleasedRef.current = true;
    sessionStorage.removeItem(STORAGE_KEY);
    const lockId = myLockIdRef.current;
    if (!lockId) return;
    try {
      await fetch(`/api/pages/${id}/edit-locks/${lockId}`, {
        method: "DELETE",
        credentials: "include",
        keepalive: true,
      });
    } catch {
      // ignore – lock will expire on its own
    }
  }, [id, STORAGE_KEY]);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (userLoading) return;
    if (hasRedirected.current) return;
    if (!isUserAuthenticated(user)) {
      hasRedirected.current = true;
      router.push("/auth/signin");
    }
  }, [user, userLoading, router]);

  // Fetch page data
  useEffect(() => {
    if (userLoading) return;
    if (!isUserAuthenticated(user)) return;
    if (page && page.id.toString() === id) return;

    fetch(`/api/pages/${id}/edit?draft=true`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch page");
        return res.json();
      })
      .then((data) => setPage(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, userLoading, user, page]);

  // Once page is loaded, check for existing edit locks
  useEffect(() => {
    if (!page || lockCheckStartedRef.current) return;
    lockCheckStartedRef.current = true; // ref guard – survives Strict Mode double-invoke

    // Check sessionStorage for a lock we held in a previous render of this tab
    const stored = sessionStorage.getItem(STORAGE_KEY);
    const storedLock: { id: number; short_id: string } | null = stored ? JSON.parse(stored) : null;

    fetch(`/api/pages/${id}/edit-locks`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) return { locks: [] as EditLock[] };
        return res.json() as Promise<{ locks: EditLock[] }>;
      })
      .then(({ locks }) => {
        setLockChecked(true);

        // Separate our own previous lock (if any) from other users' locks
        const ownPreviousLock = storedLock
          ? locks.find((l) => l.id === storedLock.id)
          : null;
        const otherLocks = locks.filter((l) => !ownPreviousLock || l.id !== ownPreviousLock.id);

        if (ownPreviousLock) {
          // Refresh scenario: silently re-adopt our existing lock
          reAdoptLock(ownPreviousLock);
          // If others are also editing, still warn about those
          if (otherLocks.length > 0) {
            setExistingLocks(otherLocks);
            setShowLockWarning(true);
          }
        } else if (otherLocks.length > 0) {
          setExistingLocks(otherLocks);
          setShowLockWarning(true);
        } else {
          acquireLock();
        }
      })
      .catch(() => {
        setLockChecked(true);
        acquireLock();
      });
  }, [page, id, acquireLock, reAdoptLock, STORAGE_KEY]);

  // Release our specific lock on unmount (in-app navigation)
  useEffect(() => {
    if (!lockAcquired) return;
    return () => {
      void releaseLock();
    };
  }, [lockAcquired, releaseLock]);

  // ── Warning dialog handlers ──────────────────────────────────────────────

  function handleLockWarningContinue() {
    setShowLockWarning(false);
    acquireLock();
  }

  function handleLockWarningGoBack() {
    setShowLockWarning(false);
    router.back();
  }

  // Cancel handler: await lock release before navigating so unmount cleanup is a no-op
  async function handleCancel() {
    await releaseLock();
    router.push(`/pages/${id}`);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (userLoading || !isUserAuthenticated(user)) {
    return <div className="text-indigo-400 p-8">Loading...</div>;
  }

  if (loading) return <div className="text-indigo-400 p-8">Loading...</div>;
  if (error) return <div className="text-red-400 p-8">{error}</div>;
  if (!page) return <div className="text-red-400 p-8">Page not found</div>;

  // Check if user has edit permissions for this specific page
  if (!canUserEditPage(user, page)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="bg-gray-900/90 border border-gray-800 rounded-lg p-10 shadow-lg text-center max-w-md">
          <h1 className="text-3xl font-bold text-red-400 mb-4">Edit Restricted</h1>
          <p className="text-indigo-100 mb-2">You don&apos;t have permission to edit this page.</p>
          <p className="text-indigo-300 text-sm mb-6">
            Only users in the following groups can edit: {page.edit_groups?.join(', ') || 'None'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push(`/pages/${id}`)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded transition-colors font-medium"
            >
              View Page
            </button>
            <button
              onClick={() => router.push('/pages')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded transition-colors font-medium"
            >
              All Pages
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {showLockWarning && (
        <EditLockWarning
          pageId={page.id}
          locks={existingLocks}
          onContinue={handleLockWarningContinue}
          onGoBack={handleLockWarningGoBack}
        />
      )}
      <div className="min-h-screen min-w-0 w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 flex">
        <main className="flex-1 flex flex-col items-stretch justify-start p-0 min-h-0 min-w-0 h-full w-full">
          <div className="w-full h-full flex-1 flex flex-col min-h-0 min-w-0">
            <PageEditor
              mode="edit"
              page={page}
              onSuccess={() => router.push(`/pages/${id}`)}
              onCancel={handleCancel}
              lockShortId={myLockShortId ?? undefined}
            />
          </div>
        </main>
      </div>
    </>
  );
}

