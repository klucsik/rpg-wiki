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
import { useDraftStatus } from "./hooks/useDraftStatus";

export default function PagesView({ initialId }: { initialId?: number | null }) {
  const { user } = useUser();
  const router = useRouter();
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(initialId ?? null);
  const [showHistory, setShowHistory] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [selectedPage, setSelectedPage] = useState<WikiPage | null>(null);

  // Check for draft status
  const draftStatus = useDraftStatus(
    selectedPage?.id,
    isUserAuthenticated(user) && selectedPage ? canUserEditPage(user, selectedPage) : false
  );

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

  // Fetch individual page data when selectedId changes to get version info
  useEffect(() => {
    if (selectedId) {
      authenticatedFetch(`/api/pages/${selectedId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch page details");
          return res.json();
        })
        .then((pageData) => {
          setSelectedPage(pageData);
        })
        .catch((err) => {
          console.error("Failed to fetch page details:", err);
          // Fallback to basic page data from list
          const fallbackPage = pages.find((p) => p.id === selectedId) || null;
          setSelectedPage(fallbackPage);
        });
    } else {
      setSelectedPage(null);
    }
  }, [selectedId, pages]);

  useEffect(() => {
    if (initialId !== undefined && initialId !== selectedId) {
      setSelectedId(initialId);
    }
  }, [initialId, selectedId]);

  const canViewSelected = selectedPage && canUserViewPage(user, selectedPage);

  function handleEdit(id: number) {
    router.push(`/pages/${id}/edit`);
  }

  return (
    <div className={styles.container}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:fixed lg:translate-x-0 transition-transform duration-300 ease-in-out z-30
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        w-80 lg:w-80 h-[calc(100vh-64px)] top-16 left-0 overscroll-contain
      `}>
        <PageList
          pages={pages}
          selectedId={selectedId}
          onClose={() => setSidebarOpen(false)}
        />
      </div>
      <main className={`${styles.main} ml-0 lg:ml-80`}>
        {/* Sidebar toggle button for mobile */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed top-20 left-4 z-50 bg-gray-800 text-indigo-300 p-2 rounded-lg shadow-lg lg:hidden hover:bg-gray-700 transition"
            aria-label="Open sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        
        <div className="w-full h-full flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden" style={{height: 'calc(100vh - 64px)'}}>
          {loading && <div className="text-indigo-400 p-4">Loading...</div>}
          {error && (
            <div className="text-red-400 font-semibold mb-2 p-4">{error}</div>
          )}
          {/* VIEW PAGE */}
          {selectedPage && canViewSelected && (
            <div className={`prose prose-invert max-w-none ${styles.proseBox}`} style={{overflowX: 'hidden'}}>
              <div className={styles.header}>
                <div className="min-w-0 flex-1">
                  {selectedPage.path && (
                    <div className={styles.path}>{selectedPage.path}</div>
                  )}
                  <h2 className="text-2xl font-bold text-indigo-200 break-words">
                    {selectedPage.title}
                  </h2>
                  {/* Draft indicator */}
                  {draftStatus.hasDraft && (
                    <div className="mt-2 px-3 py-1 bg-yellow-900/40 border border-yellow-600 rounded-lg text-yellow-200 text-sm">
                      <span className="font-semibold">Draft available:</span> You have unsaved changes
                      {draftStatus.draftSavedAt && (
                        <span className="ml-1">
                          (saved {new Date(draftStatus.draftSavedAt).toLocaleTimeString()})
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  {isUserAuthenticated(user) && canUserEditPage(user, selectedPage) && (
                      <>
                        <button
                          onClick={() => setShowHistory(!showHistory)}
                          className="bg-blue-700 hover:bg-blue-800 text-white px-2 sm:px-4 py-2 rounded-lg transition border border-blue-800 text-sm sm:text-base"
                        >
                          <span className="hidden sm:inline">{showHistory ? 'Hide History' : 'View History'}</span>
                          <span className="sm:hidden">📜</span>
                        </button>
                        <button
                          onClick={() => handleEdit(selectedPage.id)}
                          className={styles.editButton}
                        >
                          <span className="hidden sm:inline">Edit</span>
                          <span className="sm:hidden">✏️</span>
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
              
              <div className="flex-1 overflow-auto min-h-0 min-w-0 max-w-full">
                {selectedPage.content ? (
                  <div className="prose prose-invert max-w-none overflow-x-hidden break-words">
                    {parseWikiContentWithRestrictedBlocks(selectedPage.content, {
                      groups: user.groups,
                    })}
                  </div>
                ) : (
                  <div>No content</div>
                )}
              </div>
              <div className={styles.pageFooter}>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                  <span>Last updated: {selectedPage.updated_at ? new Date(selectedPage.updated_at).toLocaleString() : ""}</span>
                  {selectedPage.version && (
                    <span>Version: {selectedPage.version}</span>
                  )}
                  <span className="break-all">View groups: {Array.isArray(selectedPage.view_groups) ? selectedPage.view_groups.join(', ') : ''}</span>
                  <span className="break-all">Edit groups: {Array.isArray(selectedPage.edit_groups) ? selectedPage.edit_groups.join(', ') : ''}</span>
                </div>
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
