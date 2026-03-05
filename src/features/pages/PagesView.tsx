"use client";

import React, { useEffect, useState } from "react";
import PageList from "./PageList";
import { WikiPage } from "../../types";
import { useUser } from "../auth/userContext";
import { canUserViewPage, canUserEditPage, isUserAuthenticated } from "../auth/accessControl";
import { parseWikiContentWithRestrictedBlocks } from "../../lib/restricted-content-parser";
import { useRouter } from "next/navigation";
import VersionHistory from "./VersionHistory";
import { authenticatedFetch } from "../../lib/api/apiHelpers";
import { useDraftStatus } from "../../hooks/useDraftStatus";

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
    if (!selectedId) {
      return;
    }
      
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
  }, [selectedId, pages]);

  const canViewSelected = selectedPage && canUserViewPage(user, selectedPage);

  function handleEdit(id: number) {
    router.push(`/pages/${id}/edit`);
  }

  return (
    <div className="min-h-screen h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex relative overflow-hidden max-w-[100vw]">
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
      <main className="flex-1 flex flex-col items-stretch justify-start p-0 min-h-0 min-w-0 h-screen w-full overflow-hidden max-w-full overscroll-contain box-border ml-0 lg:ml-80">
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
        
        <div className="w-full h-full flex flex-col min-h-0 min-w-0" style={{height: 'calc(100vh - 64px)'}}>
          {loading && <div className="text-indigo-400 p-4">Loading...</div>}
          {error && (
            <div className="text-red-400 font-semibold mb-2 p-4">{error}</div>
          )}
          {/* VIEW PAGE */}
          {selectedPage && canViewSelected && (
            <div className="prose prose-invert max-w-none bg-gray-900/80 rounded-lg p-4 shadow-xl border border-gray-800 w-full flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden max-w-full box-border">
              <div className="flex items-start justify-between mb-4 gap-4 min-w-0 max-sm:flex-col max-sm:items-stretch max-sm:gap-3">
                <div className="min-w-0 flex-1">
                  {selectedPage.path && (
                    <div className="text-xs text-gray-400 mb-1 font-mono bg-gray-800 px-2 py-0.5 rounded">{selectedPage.path}</div>
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
                          className="bg-amber-700 hover:bg-amber-800 text-white py-1 px-3 rounded-md font-semibold text-sm shadow transition-colors"
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
              
              {selectedPage.content ? (
                <div className="prose prose-invert max-w-none overflow-x-hidden break-words flex-1 overflow-auto min-h-0">
                  {parseWikiContentWithRestrictedBlocks(selectedPage.content, {
                    groups: user.groups,
                  })}
                </div>
              ) : (
                <div>No content</div>
              )}
              <div className="mt-6 text-xs text-gray-500">
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
            <div className="flex items-center justify-center min-h-screen">
              <div className="bg-gray-900/90 border border-gray-800 rounded-lg p-10 shadow-xl text-center">
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
