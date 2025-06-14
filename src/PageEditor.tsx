import React, { useState } from "react";
import { TiptapEditor } from "./TiptapEditor";
import { useRouter } from "next/navigation";
import { useUser } from "./userContext";
import { useGroups } from "./groupsContext";

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
  title,
  content,
  setTitle,
  setContent,
  onSave,
  onCancel,
  saving,
  slug,
  path = "",
  setPath = () => {},
  editGroups = ["admin", "editor"],
  setEditGroups,
  viewGroups = ["admin", "editor", "viewer", "public"],
  setViewGroups,
}: {
  mode: "edit" | "create";
  title: string;
  content: string;
  setTitle: (t: string) => void;
  setContent: (c: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  slug?: string;
  path?: string;
  setPath?: (p: string) => void;
  editGroups?: string[];
  setEditGroups?: (groups: string[]) => void;
  viewGroups?: string[];
  setViewGroups?: (groups: string[]) => void;
}) {
  const router = useRouter();
  const { user } = useUser();
  const isDisabled = user.group === "public";
  const { groups } = useGroups();
  const [search, setSearch] = useState("");
  const [viewSearch, setViewSearch] = useState("");
  const filteredGroups = groups.filter((g) => g.includes(search));
  const filteredViewGroups = groups.filter((g) => g.includes(viewSearch));

  return (
    <>
      {/* Header with Save/Cancel and Title */}
      <header className={styleTokens.header}>
        <div className="flex flex-col gap-2 flex-1">
          <label className={styleTokens.label}>Path</label>
          <input
            type="text"
            placeholder="/lore/dragons"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-700 bg-gray-900 text-indigo-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-700 font-mono text-base shadow-sm min-w-0 mb-2"
            disabled={saving || isDisabled}
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            disabled={saving || isDisabled}
            className="flex-1 px-4 py-2 border border-gray-700 bg-gray-900 text-indigo-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-700 text-2xl font-bold shadow-sm min-w-0"
          />
        </div>
        <div className="flex flex-col gap-1 min-w-[220px]">
          <label className={styleTokens.label}>Who can edit?</label>
          <input
            type="text"
            placeholder="Search groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styleTokens.input}
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
        {/* Who can see? block */}
        <div className="flex flex-col gap-1 min-w-[220px]">
          <label className={styleTokens.label}>Who can see?</label>
          <input
            type="text"
            placeholder="Search groups..."
            value={viewSearch}
            onChange={(e) => setViewSearch(e.target.value)}
            className={styleTokens.input}
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
        <div className="flex gap-2">
          <button
            onClick={onSave}
            disabled={saving || isDisabled}
            className={styleTokens.button}
          >
            {mode === "edit" ? "Save" : "Create"}
          </button>
          <button
            onClick={() => {
              if (slug) router.push(`/pages/${slug}`);
              else onCancel();
            }}
            disabled={saving}
            className="bg-gray-700 text-gray-200 font-bold px-6 py-2 rounded-lg shadow hover:bg-gray-600 transition disabled:opacity-50 text-lg border border-gray-600"
          >
            Cancel
          </button>
        </div>
      </header>
      {/* Editor area maximized */}
      <main className="flex-1 flex flex-col overflow-hidden p-0 m-0">
        <div className="flex-1 flex flex-col min-h-0">
          <TiptapEditor value={content} onChange={setContent} pageEditGroups={editGroups} />
        </div>
      </main>
    </>
  );
}
