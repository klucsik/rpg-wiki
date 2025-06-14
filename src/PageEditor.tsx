import React, { useState } from "react";
import { TiptapEditor } from "./TiptapEditor";
import { useRouter } from "next/navigation";
import { useUser } from "./userContext";
import { useGroups } from "./groupsContext";
import { WikiPage } from "./types";

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
  const isDisabled = user.group === "public";
  const { groups } = useGroups();
  const [title, setTitle] = useState(page?.title || "");
  const [content, setContent] = useState(page?.content || "");
  const [editGroups, setEditGroups] = useState<string[]>(page?.edit_groups || (user.group ? [user.group] : []));
  const [viewGroups, setViewGroups] = useState<string[]>(page?.view_groups || (user.group ? [user.group] : []));
  const [path, setPath] = useState(page?.path || "");
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewSearch, setViewSearch] = useState("");
  const filteredGroups = groups.filter((g) => g.includes(search));
  const filteredViewGroups = groups.filter((g) => g.includes(viewSearch));

  async function handleSave() {
    if (!title || !content || !path) {
      setValidationError("Title, Content, and Path are required.");
      return;
    }
    setValidationError(null);
    setSaving(true);
    setError(null);
    try {
      let res, saved;
      if (mode === "edit" && page) {
        res = await fetch(`/api/pages/${page.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, edit_groups: editGroups, view_groups: viewGroups, path }),
        });
        if (!res.ok) throw new Error("Failed to update page");
        saved = await res.json();
      } else {
        res = await fetch("/api/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, edit_groups: editGroups, view_groups: viewGroups, path }),
        });
        if (!res.ok) throw new Error("Failed to add page");
        saved = await res.json();
      }
      if (onSuccess) onSuccess(saved);
      else if (mode === "edit" && page) router.push(`/pages/${page.id}`);
      else router.push(`/pages/${saved.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!page) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/pages/${page.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete page");
      if (onSuccess) onSuccess(undefined); // Signal parent to refresh page list
      else router.push("/pages");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-row w-full h-full min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Sidebar pinned below the main navbar */}
      <aside className="fixed left-0 top-[56px] h-[calc(100vh-56px)] w-full max-w-xs min-w-[320px] bg-gray-800 border-r border-gray-700 flex flex-col gap-4 p-6 z-30 overflow-y-auto">
        {/* Path */}
        <div className="mb-2">
          <label className={styleTokens.label}>Path</label>
          <input
            type="text"
            placeholder="/lore/dragons"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            className="w-full px-4 py-2 border border-gray-700 bg-gray-900 text-indigo-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-700 font-mono text-base shadow-sm min-w-0 mb-2"
            disabled={saving || isDisabled}
          />
        </div>
        {/* Title */}
        <div className="mb-2">
          <label className={styleTokens.label}>Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            disabled={saving || isDisabled}
            className="w-full px-4 py-2 border border-gray-700 bg-gray-900 text-indigo-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-700 text-2xl font-bold shadow-sm min-w-0"
          />
        </div>
        {/* Who can edit? */}
        <div className="mb-2">
          <label className={styleTokens.label}>Who can edit?</label>
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
            disabled={saving || isDisabled}
            className={styleTokens.button}
          >
            {mode === "edit" ? "Save" : "Create"}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="bg-gray-700 text-gray-200 font-bold px-6 py-2 rounded-lg shadow hover:bg-gray-600 transition disabled:opacity-50 text-lg border border-gray-600"
          >
            Cancel
          </button>
        </div>
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
      </aside>
      {/* Main content area: Tiptap toolbar and editor */}
      <div className="flex-1 flex flex-col min-h-0 ml-[320px]">
        <main className="flex-1 flex flex-col overflow-hidden p-0 m-0 h-screen w-full">
          <div className="flex-1 flex flex-col min-h-0 w-full h-full">
            <TiptapEditor value={content} onChange={setContent} pageEditGroups={editGroups} />
          </div>
        </main>
      </div>
    </div>
  );
}
