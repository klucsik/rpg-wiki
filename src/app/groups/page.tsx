// This page has been moved to the Admin page. You can safely delete this file.

"use client";

import React, { useState } from "react";
import { useGroups } from "../../groupsContext";
import { styleTokens } from "../../PageEditor";

const GroupsAdminPage = () => {
  const { groups, addGroup, removeGroup } = useGroups();
  const [newGroup, setNewGroup] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <div className={styleTokens.card}>
      <h1 className="text-2xl font-bold mb-4">Manage Groups</h1>
      <ul className="mb-6">
        {groups.map((g: string) => (
          <li key={g} className="flex items-center gap-2 mb-2">
            <span className="font-mono text-lg">{g}</span>
            <button
              className="px-2 py-1 text-xs rounded bg-red-700 hover:bg-red-800 text-white font-semibold shadow border border-red-900"
              style={{ minWidth: 0 }}
              onClick={() => setConfirmDelete(g)}
              // Button is always enabled, but modal will block destructive action for admin/public
            >
              Delete
            </button>
            {confirmDelete === g && (
              <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 shadow-lg text-center">
                  <h2 className="text-lg font-bold text-red-400 mb-4">
                    {g === "admin" || g === "public"
                      ? `The ${g} group cannot be deleted.`
                      : `Are you sure you want to delete group "${g}"?`}
                  </h2>
                  <div className="flex gap-4 justify-center">
                    {g !== "admin" && g !== "public" && (
                      <button
                        className="px-4 py-1 rounded bg-red-700 hover:bg-red-800 text-white font-semibold shadow border border-red-900"
                        onClick={() => {
                          removeGroup(g);
                          setConfirmDelete(null);
                        }}
                      >
                        Yes, Delete
                      </button>
                    )}
                    <button
                      className="px-4 py-1 rounded bg-gray-700 hover:bg-gray-800 text-white font-semibold shadow border border-gray-900"
                      onClick={() => setConfirmDelete(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (newGroup.trim()) {
            addGroup(newGroup.trim());
            setNewGroup("");
          }
        }}
        className="flex gap-2"
      >
        <input
          className={styleTokens.input + " flex-1"}
          placeholder="New group name"
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
        />
        <button
          className={styleTokens.button + " btn btn-primary"}
          type="submit"
        >
          Add Group
        </button>
      </form>
    </div>
  );
};

export default GroupsAdminPage;
