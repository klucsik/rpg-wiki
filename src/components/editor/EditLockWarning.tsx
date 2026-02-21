"use client";

import { useState } from "react";
import { useUser } from "../../features/auth";
import type { User } from "../../features/auth/userContext";
import { authenticatedFetch } from "../../lib/api/apiHelpers";

export interface EditLock {
  id: number;
  short_id: string;
  username: string;
  created_at: string;
}

interface EditLockWarningProps {
  pageId: number;
  locks: EditLock[];
  onContinue: () => void;
  onGoBack: () => void;
}

export default function EditLockWarning({
  pageId,
  locks: initialLocks,
  onContinue,
  onGoBack,
}: EditLockWarningProps) {
  const { user } = useUser();
  const isAdmin = (user as User | null)?.groups?.includes("admin") ?? false;
  const [locks, setLocks] = useState<EditLock[]>(initialLocks);
  const [clearing, setClearing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function forceDeleteLock(lockId: number) {
    setClearing(lockId);
    setError(null);
    try {
      const res = await authenticatedFetch(
        `/api/pages/${pageId}/edit-locks/${lockId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to clear lock");
      }
      setLocks((prev) => prev.filter((l) => l.id !== lockId));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setClearing(null);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60">
      <div className="bg-gray-900 border border-yellow-700 rounded-lg p-8 shadow-xl max-w-lg w-full mx-4">
        <h2 className="text-2xl font-bold text-yellow-400 mb-2">Page Is Being Edited</h2>
        <p className="text-gray-300 mb-5">
          This page is currently open for editing by the following user
          {locks.length !== 1 ? "s" : ""}. Editing simultaneously may cause conflicts.
        </p>

        {/* Lock list – show up to all active locks (at least 3 slots visible) */}
        <div className="space-y-2 mb-6 max-h-52 overflow-y-auto">
          {locks.length === 0 ? (
            <p className="text-green-400 text-sm">All locks have been cleared.</p>
          ) : (
            locks.map((lock) => (
              <div
                key={lock.id}
                className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded px-4 py-2"
              >
                <div>
                  <span className="font-mono text-yellow-300 bg-gray-700 px-1.5 py-0.5 rounded text-xs mr-2 select-all">
                    {lock.short_id}
                  </span>
                  <span className="text-indigo-200 font-semibold">{lock.username}</span>
                  <span className="text-gray-400 text-xs ml-2">
                    since {new Date(lock.created_at).toLocaleString()}
                  </span>
                </div>
                {isAdmin && (
                  <button
                    className="ml-3 px-3 py-1 rounded bg-red-700 hover:bg-red-800 text-white text-xs font-semibold disabled:opacity-50"
                    onClick={() => forceDeleteLock(lock.id)}
                    disabled={clearing === lock.id}
                    title="Force clear this lock (admin)"
                  >
                    {clearing === lock.id ? "Clearing…" : "Force Clear"}
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <div className="flex gap-4 justify-end">
          <button
            className="px-6 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white font-semibold shadow border border-gray-600"
            onClick={onGoBack}
          >
            Go Back
          </button>
          <button
            className="px-6 py-2 rounded bg-yellow-600 hover:bg-yellow-700 text-white font-semibold shadow border border-yellow-800"
            onClick={onContinue}
          >
            Continue Editing
          </button>
        </div>
      </div>
    </div>
  );
}
