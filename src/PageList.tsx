import React from "react";
import { WikiPage } from "../types";
import { useRouter } from "next/navigation";

export default function PageList({
  pages,
  onSelect,
  selectedId,
  onDelete,
  onEdit,
  saving,
}: {
  pages: WikiPage[];
  onSelect: (id: number) => void;
  selectedId: number | null;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
  saving: boolean;
}) {
  const router = useRouter();
  return (
    <aside className="w-64 min-w-56 max-w-xs bg-gray-900/80 border-r border-gray-800 h-full overflow-y-auto p-4 flex flex-col">
      <h3 className="text-lg font-bold text-indigo-200 mb-4 flex items-center justify-between">
        Pages
        <button
          onClick={() => router.push("/pages/create")}
          className="bg-green-700 text-white px-2 py-1 rounded text-xs font-semibold shadow hover:bg-green-800 transition"
        >
          + New
        </button>
      </h3>
      <ul className="space-y-1 flex-1">
        {pages.map((p) => (
          <li key={p.id}>
            <button
              className={`w-full text-left px-3 py-2 rounded transition font-medium truncate ${
                selectedId === p.id
                  ? "bg-indigo-800 text-indigo-100"
                  : "bg-gray-800 text-indigo-300 hover:bg-gray-700"
              }`}
              onClick={() => onSelect(p.id)}
            >
              {p.title}
            </button>
            <div className="flex gap-1 mt-1">
              <button
                onClick={() => onEdit(p.id)}
                className="text-xs px-2 py-1 rounded bg-indigo-900/60 text-indigo-200 hover:bg-indigo-800 transition disabled:opacity-50"
                disabled={saving}
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(p.id)}
                className="text-xs px-2 py-1 rounded bg-red-900/60 text-red-300 hover:bg-red-800 transition disabled:opacity-50"
                disabled={saving}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
