"use client";

import React, { useEffect, useState } from "react";
import PageList from "./PageList";
import { WikiPage } from "./types";
import { useUser } from "./userContext";
import { canUserViewPage } from "./accessControl";
import { parseHtmlWithRestrictedBlocks } from "./app/pageviewer";
import { useRouter } from "next/navigation";

export default function PagesView({ initialId }: { initialId?: number | null }) {
  const { user } = useUser();
  const router = useRouter();
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(initialId ?? null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch("/api/pages")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch pages");
        return res.json();
      })
      .then((data) => {
        setPages(data);
        if (initialId && data.some((p: WikiPage) => p.id === initialId)) {
          setSelectedId(initialId);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [initialId]);

  useEffect(() => {
    if (initialId !== undefined && initialId !== selectedId) {
      setSelectedId(initialId);
    }
  }, [initialId]);

  const selectedPage = pages.find((p) => p.id === selectedId) || null;
  const canViewSelected = selectedPage && canUserViewPage(user, selectedPage);

  function handleSelect(id: number) {
    setSelectedId(id);
    router.push(`/pages/${id}`);
  }

  function handleEdit(id: number) {
    router.push(`/pages/${id}/edit`);
  }

  async function deletePage(id: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pages/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete page");
      setPages((pages) => pages.filter((p) => p.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen min-w-0 w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 flex">
      <PageList
        pages={pages}
        onSelect={handleSelect}
        selectedId={selectedId}
        onDelete={deletePage}
        onEdit={handleEdit}
        saving={false}
      />
      <main className="flex-1 flex flex-col items-stretch justify-start p-0 min-h-0 min-w-0 h-full w-full">
        <div className="w-full h-full flex-1 flex flex-col min-h-0 min-w-0">
          {loading && <div className="text-indigo-400">Loading...</div>}
          {error && (
            <div className="text-red-400 font-semibold mb-2">{error}</div>
          )}
          {/* VIEW PAGE */}
          {selectedPage && canViewSelected && (
            <div className="prose prose-invert w-full h-full flex-1 mx-0 bg-gray-900/80 rounded-none p-8 shadow-lg border border-gray-800 flex flex-col min-h-0 min-w-0 overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  {selectedPage.path && (
                    <div className="text-xs text-gray-400 mb-1">
                      <span className="font-mono bg-gray-800 px-2 py-0.5 rounded">{selectedPage.path}</span>
                    </div>
                  )}
                  <h2 className="text-2xl font-bold text-indigo-200">
                    {selectedPage.title}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {user.group !== "public" &&
                    Array.isArray(selectedPage.edit_groups) &&
                    selectedPage.edit_groups.includes(user.group) && (
                      <button
                        onClick={() => handleEdit(selectedPage.id)}
                        className="bg-yellow-700 text-white px-3 py-1 rounded font-semibold shadow hover:bg-yellow-800 transition text-sm"
                      >
                        Edit
                      </button>
                    )}
                </div>
              </div>
              <div className="flex-1 overflow-auto min-h-0 min-w-0">
                {selectedPage.content ? (
                  parseHtmlWithRestrictedBlocks(selectedPage.content, {
                    groups: user.groups || [user.group],
                  })
                ) : (
                  <div>No content</div>
                )}
              </div>
              <div className="mt-6 text-xs text-gray-500">
                Last updated: {selectedPage.updated_at ? new Date(selectedPage.updated_at).toLocaleString() : ""}
              </div>
            </div>
          )}
          {/* NO ACCESS */}
          {selectedPage && !canViewSelected && (
            <div className="flex items-center justify-center min-h-full">
              <div className="bg-gray-900/90 border border-gray-800 rounded-lg p-10 shadow-lg text-center">
                <h1 className="text-3xl font-bold text-red-400 mb-4">No Access</h1>
                <p className="text-indigo-100 mb-2">
                  You do not have permission to view this page.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
