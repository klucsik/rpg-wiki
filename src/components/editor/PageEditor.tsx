import React, { useEffect, useState } from "react";
import { TiptapEditor } from "./TiptapEditor";
import { WikiPage } from "../../types";
import { useUser } from "../../features/auth/userContext";
import { useGroups } from "../../features/groups/groupsContext";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "../../lib/api/apiHelpers";
import { isUserAuthenticated } from "../../features/auth/accessControl";
import { useAutosave } from "../../hooks/useAutosave";
import PathAutocomplete from "../ui/PathAutocomplete";

// Extract shared style constants for use in both PageEditor and GroupsAdminPage
export const styleTokens = {
  card: "bg-gray-900/80 rounded-lg p-8 shadow-lg border border-gray-800 max-w-2xl mx-auto",
  header: "flex items-center justify-between gap-4 px-8 py-4 bg-gray-800 border-b border-gray-700 sticky top-0 z-40",
  label: "text-xs text-indigo-200 font-semibold mb-1",
  input: "px-2 py-1 rounded border border-gray-700 bg-gray-900 text-indigo-100 text-sm mb-1",
  button: "bg-indigo-600 text-white font-bold px-6 py-2 rounded-lg shadow hover:bg-indigo-700 transition disabled:opacity-50 text-lg border border-indigo-700",
  tag: "bg-indigo-700 text-white px-2 py-0.5 rounded text-xs flex items-center gap-1",
  tagRemove: "ml-1 text-red-200 hover:text-red-400",
  groupList: "flex flex-wrap gap-1 mb-1",
  groupButton: "bg-gray-700 text-indigo-100 px-2 py-0.5 rounded text-xs hover:bg-indigo-800",
};

export default function PageEditor({
  mode,
  page,
  onSuccess,
  onCancel,
}: {
  mode: "edit" | "create";
  page?: WikiPage;
  onSuccess?: (page?: WikiPage) => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const { user } = useUser();
  const isDisabled = !isUserAuthenticated(user);
  const { groups } = useGroups();
  const [title, setTitle] = useState(page?.title || "");
  const [content, setContent] = useState(page?.content || "");
  // Default groups for new pages: admin + creator (username)
  const getDefaultGroups = () => {
    if (page) return page.edit_groups || page.view_groups || [];
    return user.username ? ['admin', user.username] : (user.groups.length > 0 ? [user.groups[0]] : []);
  };
  
  const [editGroups, setEditGroups] = useState<string[]>(page?.edit_groups || getDefaultGroups());
  const [viewGroups, setViewGroups] = useState<string[]>(page?.view_groups || getDefaultGroups());
  const [path, setPath] = useState(page?.path || "/");
  const [changeSummary, setChangeSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteDraftModal, setShowDeleteDraftModal] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewSearch, setViewSearch] = useState("");
  const [autosaveStatus, setAutosaveStatus] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pathError, setPathError] = useState<string | null>(null);
  const [existingPages, setExistingPages] = useState<WikiPage[]>([]);
  const filteredGroups = groups.filter((g) => g.includes(search));
  const filteredViewGroups = groups.filter((g) => g.includes(viewSearch));

  // Fetch existing pages to validate path+title uniqueness
  useEffect(() => {
    const fetchExistingPages = async () => {
      try {
        const response = await authenticatedFetch("/api/pages");
        if (response.ok) {
          const pages = await response.json();
          setExistingPages(pages);
        }
      } catch (error) {
        console.error("Failed to fetch existing pages:", error);
      }
    };

    fetchExistingPages();
  }, []);

  // Validate path+title combination when either changes
  useEffect(() => {
    if (!title.trim()) {
      setPathError(null);
      return;
    }

    const trimmedPath = path.trim();
    const trimmedTitle = title.trim();
    
    // Find if there's an existing page with the same path+title combination
    const conflictingPage = existingPages.find(p => 
      p.path === trimmedPath && p.title === trimmedTitle
    );
    
    // For create mode, check if path+title combination already exists
    if (mode === "create" && conflictingPage) {
      setPathError(`A page already exists with the path "${trimmedPath}" and title "${trimmedTitle}". Please choose a different path or title.`);
      return;
    }
    
    // For edit mode, allow the current page's path+title combination
    if (mode === "edit" && page && conflictingPage && conflictingPage.id !== page.id) {
      setPathError(`A page already exists with the path "${trimmedPath}" and title "${trimmedTitle}". Please choose a different path or title.`);
      return;
    }
    
    setPathError(null);
  }, [path, title, existingPages, mode, page]);

  // Check if save should be disabled
  const isSaveDisabled = saving || isDisabled || !title || !content || !!pathError;

  // Autosave functionality
  const { saveNow, deleteDraft } = useAutosave({
    pageId: page?.id,
    title,
    content,
    editGroups,
    viewGroups,
    path,
    enabled: mode === "edit" && !isDisabled,
    onSaveSuccess: (data) => {
      // Handle no_change response for manual draft saves
      if (data.no_change) {
        setError(null);
        setAutosaveStatus("No changes detected - draft is already up to date.");
        setTimeout(() => setAutosaveStatus(""), 3000);
        return;
      }
      
      setAutosaveStatus(`Draft saved at ${new Date(data.saved_at).toLocaleTimeString()}`);
      setTimeout(() => setAutosaveStatus(""), 3000);
    },
    onSaveError: (error) => {
      setAutosaveStatus(`Autosave failed: ${error}`);
      setTimeout(() => setAutosaveStatus(""), 5000);
    }
  });

  async function handleSave() {
    if (!title || !content) {
      setValidationError("Title and Content are required.");
      return;
    }
    if (pathError) {
      setValidationError("Please fix the path and title combination error before saving.");
      return;
    }
    
    setValidationError(null);
    setSaving(true);
    setError(null);
    try {
      let res, saved;
      if (mode === "edit" && page) {
        res = await authenticatedFetch(`/api/pages/${page.id}`, {
          method: "PUT",
          body: JSON.stringify({ 
            title, 
            content, 
            edit_groups: editGroups, 
            view_groups: viewGroups, 
            path,
            change_summary: changeSummary || undefined
          }),
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to update page");
        }
        saved = await res.json();
        
        // Handle no_change response
        if (saved.no_change) {
          // Show a message that no changes were detected and clear any errors
          setError(null);
          setAutosaveStatus("No changes detected - page is already up to date.");
          setTimeout(() => setAutosaveStatus(""), 3000);
          return;
        }
      } else {
        res = await authenticatedFetch("/api/pages", {
          method: "POST",
          body: JSON.stringify({ 
            title, 
            content, 
            edit_groups: editGroups, 
            view_groups: viewGroups, 
            path,
            change_summary: changeSummary || undefined
          }),
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to add page");
        }
        saved = await res.json();
        
        // Handle no_change response
        if (saved.no_change) {
          // Show a message that no changes were detected and clear any errors
          setError(null);
          setAutosaveStatus("No changes detected - content is already up to date.");
          setTimeout(() => setAutosaveStatus(""), 3000);
          return;
        }
      }
      if (onSuccess) onSuccess(saved);
      else if (mode === "edit" && page) router.push(`/pages/${page.id}`);
      else router.push(`/pages/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!page) return;
    setSaving(true);
    setError(null);
    try {
      const res = await authenticatedFetch(`/api/pages/${page.id}`, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete page");
      }
      if (onSuccess) onSuccess(undefined); // Signal parent to refresh page list
      else router.push("/pages");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDraft() {
    setSaving(true);
    setError(null);
    try {
      await deleteDraft();
      setAutosaveStatus("Draft deleted successfully.");
      setTimeout(() => setAutosaveStatus(""), 3000);
      
      // Reload the latest published version of the page
      if (page) {
        try {
          const res = await authenticatedFetch(`/api/pages/${page.id}`);
          if (res.ok) {
            const latestPage = await res.json();
            // Update the form with the latest published version
            setTitle(latestPage.title || "");
            setContent(latestPage.content || "");
            setEditGroups(latestPage.edit_groups || []);
            setViewGroups(latestPage.view_groups || []);
            setPath(latestPage.path || "");
            setChangeSummary(""); // Clear change summary
          }
        } catch (reloadErr) {
          console.error("Failed to reload page after draft deletion:", reloadErr);
          // Fallback to full page refresh if API call fails
          router.refresh();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete draft");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-row w-full h-full min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 relative">
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
        left-0 top-16 h-[calc(100vh-64px)] w-full max-w-xs min-w-[320px] bg-gray-800 border-r border-gray-700 flex flex-col gap-4 p-6 overflow-y-auto overscroll-contain
      `}>
        {/* Close button for mobile */}
        <div className="flex justify-end lg:hidden mb-2">
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-gray-400 hover:text-white"
            aria-label="Close sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Path */}
        <div className="mb-2">
          <label className={styleTokens.label}>Path</label>
          <PathAutocomplete
            value={mode === "create" && path === "/" ? "" : path}
            onChange={setPath}
            placeholder={mode === "create" ? "/lore/dragons (leave empty for root)" : "/lore/dragons"}
            disabled={saving || isDisabled}
            className={`w-full px-4 py-2 border ${pathError ? 'border-red-500' : 'border-gray-700'} bg-gray-900 text-indigo-100 rounded-lg focus:outline-none focus:ring-2 ${pathError ? 'focus:ring-red-500' : 'focus:ring-indigo-700'} font-mono text-base shadow-sm min-w-0 mb-2`}
          />
          {pathError && (
            <div className="text-red-400 text-sm mt-1 mb-2">
              {pathError}
            </div>
          )}
        </div>
        {/* Title */}
        <div className="mb-2">
          <label className={styleTokens.label}>Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            disabled={saving || isDisabled}
            className={`w-full px-4 py-2 border ${pathError ? 'border-red-500' : 'border-gray-700'} bg-gray-900 text-indigo-100 rounded-lg focus:outline-none focus:ring-2 ${pathError ? 'focus:ring-red-500' : 'focus:ring-indigo-700'} text-2xl font-bold shadow-sm min-w-0`}
          />
          {pathError && (
            <div className="text-red-400 text-sm mt-1 mb-2">
              Path + Title combination must be unique
            </div>
          )}
        </div>
        
        {/* Change Summary (only show for edits) */}
        {mode === "edit" && (
          <div className="mb-2">
            <label className={styleTokens.label}>Change Summary (optional)</label>
            <input
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              placeholder="Describe what you changed..."
              disabled={saving || isDisabled}
              className="w-full px-4 py-2 border border-gray-700 bg-gray-900 text-indigo-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-700 text-sm shadow-sm min-w-0"
            />
          </div>
        )}
        
        {/* Who can edit? */}
        <div className="mb-2">
          <label className={styleTokens.label}>Who can edit?</label>
          {mode === "create" && (
            <div className="text-xs text-gray-400 mb-1">
              Default: admin + you ({user.username || 'your username'})
            </div>
          )}
          <input
            type="text"
            placeholder="Search groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styleTokens.input + " w-full"}
            disabled={isDisabled}
          />
          <div className={styleTokens.groupList}>
            {editGroups?.map((g) => (
              <span key={g} className={styleTokens.tag}>
                {g}
                {!isDisabled && (
                  <button
                    type="button"
                    className={styleTokens.tagRemove}
                    onClick={() =>
                      setEditGroups &&
                      setEditGroups(
                        editGroups.filter((eg) => eg !== g)
                      )
                    }
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {filteredGroups
              .filter((g) => !editGroups?.includes(g))
              .map((g) => (
                <button
                  key={g}
                  type="button"
                  className={styleTokens.groupButton}
                  disabled={isDisabled}
                  onClick={() =>
                    setEditGroups && setEditGroups([...editGroups, g])
                  }
                >
                  {g}
                </button>
              ))}
          </div>
        </div>
        {/* Who can see? */}
        <div className="mb-2">
          <label className={styleTokens.label}>Who can see?</label>
          {mode === "create" && (
            <div className="text-xs text-gray-400 mb-1">
              Default: admin + you ({user.username || 'your username'})
            </div>
          )}
          <input
            type="text"
            placeholder="Search groups..."
            value={viewSearch}
            onChange={(e) => setViewSearch(e.target.value)}
            className={styleTokens.input + " w-full"}
            disabled={isDisabled}
          />
          <div className={styleTokens.groupList}>
            {viewGroups?.map((g) => (
              <span key={g} className={styleTokens.tag}>
                {g}
                {!isDisabled && (
                  <button
                    type="button"
                    className={styleTokens.tagRemove}
                    onClick={() =>
                      setViewGroups &&
                      setViewGroups(
                        viewGroups.filter((vg) => vg !== g)
                      )
                    }
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {filteredViewGroups
              .filter((g) => !viewGroups?.includes(g))
              .map((g) => (
                <button
                  key={g}
                  type="button"
                  className={styleTokens.groupButton}
                  disabled={isDisabled}
                  onClick={() =>
                    setViewGroups && setViewGroups([...viewGroups, g])
                  }
                >
                  {g}
                </button>
              ))}
          </div>
        </div>
        {/* Action buttons */}
        <div className="flex flex-col gap-2 mt-4">
          <button
            onClick={handleSave}
            disabled={isSaveDisabled}
            className={styleTokens.button}
          >
            {mode === "edit" ? "Save" : "Create"}
          </button>
          {mode === "edit" && (
            <button
              onClick={saveNow}
              disabled={saving || isDisabled}
              className="bg-gray-700 text-gray-200 font-bold px-6 py-2 rounded-lg shadow hover:bg-gray-600 transition disabled:opacity-50 text-sm border border-gray-600"
            >
              Save Draft Now
            </button>
          )}
          {mode === "edit" && (
            <button
              onClick={() => setShowDeleteDraftModal(true)}
              disabled={saving || isDisabled}
              className="bg-orange-700 text-white font-bold px-6 py-2 rounded-lg shadow hover:bg-orange-600 transition disabled:opacity-50 text-sm border border-orange-800"
            >
              Delete Draft
            </button>
          )}
          <button
            onClick={onCancel}
            disabled={saving}
            className="bg-gray-700 text-gray-200 font-bold px-6 py-2 rounded-lg shadow hover:bg-gray-600 transition disabled:opacity-50 text-lg border border-gray-600"
          >
            Cancel
          </button>
        </div>
        {/* Autosave status */}
        {autosaveStatus && (
          <div className="text-sm text-green-400 mt-2 p-2 bg-green-900/20 rounded border border-green-800">
            {autosaveStatus}
          </div>
        )}
        {validationError && (
          <div className="text-red-400 font-semibold mt-2">{validationError}</div>
        )}
        {error && (
          <div className="text-red-400 font-semibold mt-2">{error}</div>
        )}
        {/* Delete button at the bottom */}
        {mode === "edit" && page && (
          <div className="mt-auto pt-8">
            <button
              className="w-full bg-red-700 hover:bg-red-800 text-white font-bold px-6 py-2 rounded-lg shadow border border-red-900 transition text-lg"
              onClick={() => setShowDeleteModal(true)}
              disabled={saving}
            >
              Delete Page
            </button>
          </div>
        )}
        {/* Are you sure? modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 shadow-lg text-center">
              <h2 className="text-2xl font-bold text-red-400 mb-4">Are you sure you want to delete this page?</h2>
              <div className="flex gap-4 justify-center mt-4">
                <button
                  className="px-6 py-2 rounded bg-red-700 hover:bg-red-800 text-white font-semibold shadow border border-red-900 text-lg"
                  onClick={() => { setShowDeleteModal(false); handleDelete(); }}
                  disabled={saving}
                >
                  Yes, Delete
                </button>
                <button
                  className="px-6 py-2 rounded bg-gray-700 hover:bg-gray-800 text-white font-semibold shadow border border-gray-900 text-lg"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Delete draft confirmation modal */}
        {showDeleteDraftModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 shadow-lg text-center">
              <h2 className="text-2xl font-bold text-orange-400 mb-4">Are you sure you want to delete your draft?</h2>
              <p className="text-gray-300 mb-6">This will permanently delete your unsaved changes and revert to the last published version.</p>
              <div className="flex gap-4 justify-center mt-4">
                <button
                  className="px-6 py-2 rounded bg-orange-700 hover:bg-orange-800 text-white font-semibold shadow border border-orange-900 text-lg"
                  onClick={() => { setShowDeleteDraftModal(false); handleDeleteDraft(); }}
                  disabled={saving}
                >
                  Yes, Delete Draft
                </button>
                <button
                  className="px-6 py-2 rounded bg-gray-700 hover:bg-gray-800 text-white font-semibold shadow border border-gray-900 text-lg"
                  onClick={() => setShowDeleteDraftModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Main content area: Tiptap toolbar and editor */}
      <div className="flex-1 flex flex-col min-h-0 ml-0 lg:ml-[320px]">
        {/* Mobile sidebar toggle button */}
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
        
        <main className="flex-1 flex flex-col overflow-hidden p-0 m-0 h-[calc(100vh-64px)] w-full overscroll-contain">
          <div className="flex-1 flex flex-col min-h-0 w-full h-full">
            <TiptapEditor value={content} onChange={setContent} pageEditGroups={editGroups} />
          </div>
        </main>
      </div>
    </div>
  );
}
