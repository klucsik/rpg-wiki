"use client";

import React, { useEffect, useState } from "react";
import PageList from "./PageList";
import { WikiPage } from "./types";
import { useUser } from "./userContext";
import { canUserViewPage, canUserEditPage, isUserAuthenticated } from "./accessControl";
import { parseWikiContentWithRestrictedBlocks } from "./lib/restricted-content-parser";
import { useRouter } from "next/navigation";
import VersionHistory from "./VersionHistory";
import styles from "./PageView.module.css";
import { authenticatedFetch } from "./apiHelpers";

export default function PagesView({ initialId }: { initialId?: number | null }) {
  const { user } = useUser();
  const router = useRouter();
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(initialId ?? null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    authenticatedFetch("/api/pages")
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
  }, [initialId, user]);

  useEffect(() => {
    if (initialId !== undefined && initialId !== selectedId) {
      setSelectedId(initialId);
    }
  }, [initialId, selectedId]);

  const selectedPage = pages.find((p) => p.id === selectedId) || null;
  const canViewSelected = selectedPage && canUserViewPage(user, selectedPage);

  function handleEdit(id: number) {
    router.push(`/pages/${id}/edit`);
  }

  return (
    <div className={styles.container}>
      <PageList
        pages={pages}
        selectedId={selectedId}
      />
      <main className={styles.main}>
        <div className="w-full h-full flex-1 flex flex-col min-h-0 min-w-0">
          {loading && <div className="text-indigo-400">Loading...</div>}
          {error && (
            <div className="text-red-400 font-semibold mb-2">{error}</div>
          )}
          {/* VIEW PAGE */}
          {selectedPage && canViewSelected && (
            <div className={`prose prose-invert ${styles.proseBox}`}>
              <div className={styles.header}>
                <div>
                  {selectedPage.path && (
                    <div className={styles.path}>{selectedPage.path}</div>
                  )}
                  <h2 className="text-2xl font-bold text-indigo-200">
                    {selectedPage.title}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {isUserAuthenticated(user) && canUserEditPage(user, selectedPage) && (
                      <>
                        <button
                          onClick={() => setShowHistory(!showHistory)}
                          className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition border border-blue-800"
                        >
                          {showHistory ? 'Hide History' : 'View History'}
                        </button>
                        <button
                          onClick={() => handleEdit(selectedPage.id)}
                          className={styles.editButton}
                        >
                          Edit
                        </button>
                      </>
                    )}
                </div>
              </div>
              
              {/* Show version history if requested */}
              {showHistory && selectedPage?.id && (
                <div className="mb-6">
                  <VersionHistory 
                    pageId={selectedPage.id} 
                    onClose={() => setShowHistory(false)}
                  />
                </div>
              )}
              
              <div className="flex-1 overflow-auto min-h-0 min-w-0">
                {selectedPage.content ? (
                  parseWikiContentWithRestrictedBlocks(selectedPage.content, {
                    groups: user.groups,
                  })
                ) : (
                  <div>No content</div>
                )}
              </div>
              <div className={styles.pageFooter}>
                Last updated: {selectedPage.updated_at ? new Date(selectedPage.updated_at).toLocaleString() : ""} &nbsp;|&nbsp; View groups: {Array.isArray(selectedPage.view_groups) ? selectedPage.view_groups.join(', ') : ''} &nbsp;|&nbsp; Edit groups: {Array.isArray(selectedPage.edit_groups) ? selectedPage.edit_groups.join(', ') : ''}
              </div>
            </div>
          )}
          {/* NO ACCESS */}
          {selectedPage && !canViewSelected && (
            <div className={styles.noAccess}>
              <div className={styles.noAccessBox}>
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
