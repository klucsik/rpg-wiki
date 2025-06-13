import React from "react";
import { TiptapEditor } from "./TiptapEditor";
import { useRouter } from "next/navigation";
import { useUser } from "./userContext";

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
}) {
  const router = useRouter();
  const { user } = useUser();
  const isDisabled = user.group === "public";

  return (
    <>
      {/* Header with Save/Cancel and Title */}
      <header className="flex items-center justify-between gap-4 px-8 py-4 bg-gray-800 border-b border-gray-700 sticky top-0 z-40">
        <div className="flex items-center gap-4 flex-1">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            disabled={saving || isDisabled}
            className="flex-1 px-4 py-2 border border-gray-700 bg-gray-900 text-indigo-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-700 text-2xl font-bold shadow-sm min-w-0"
          />
          <span
            className={`text-lg font-semibold ${
              mode === "edit" ? "text-yellow-300" : "text-green-300"
            }`}
          >
            {mode === "edit" ? "Edit Page" : "Create New Page"}
          </span>
        </div>
        {/* Global menu actions can go here */}
        <div></div>
        <div className="flex gap-2">
          <button
            onClick={onSave}
            disabled={saving || isDisabled}
            className="bg-indigo-600 text-white font-bold px-6 py-2 rounded-lg shadow hover:bg-indigo-700 transition disabled:opacity-50 text-lg border border-indigo-700"
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
          <TiptapEditor value={content} onChange={setContent} />
        </div>
      </main>
    </>
  );
}
