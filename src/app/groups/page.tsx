// This page has been moved to the Admin page. You can safely delete this file.

"use client";

import React, { useState } from "react";
import { useGroups } from "../../features/groups/groupsContext";

const GroupsAdminPage = () => {
  const { groups, addGroup, removeGroup } = useGroups();
  const [newGroup, setNewGroup] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <div className="GroupsAdminPage-root bg-gray-900/80 rounded-lg p-8 shadow-lg border border-gray-800 max-w-2xl mx-auto">
      <h1 className="GroupsAdminPage-heading text-2xl font-bold mb-4">Manage Groups</h1>
      <ul className="GroupsAdminPage-list mb-6">
        {groups.map((g: string) => (
          <li key={g} className="GroupsAdminPage-groupRow flex items-center gap-2 mb-2">
            <span className="GroupsAdminPage-groupName font-mono text-lg">{g}</span>
            <button
              className="GroupsAdminPage-deleteGroupBtn px-2 py-1 text-xs rounded bg-red-700 hover:bg-red-800 text-white font-semibold shadow border border-red-900"
              style={{ minWidth: 0 }}
              onClick={() => setConfirmDelete(g)}
              // Button is always enabled, but modal will block destructive action for admin/public
            >
              Delete
            </button>
            {confirmDelete === g && (
              <div className="GroupsAdminPageDeleteModal-overlay fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
                <div className="GroupsAdminPageDeleteModal-card bg-gray-900 border border-gray-700 rounded-lg p-6 shadow-lg text-center">
                  <h2 className="GroupsAdminPageDeleteModal-heading text-lg font-bold text-red-400 mb-4">
                    {g === "admin" || g === "public"
                      ? `The ${g} group cannot be deleted.`
                      : `Are you sure you want to delete group "${g}"?`}
                  </h2>
                  <div className="flex gap-4 justify-center">
                    {g !== "admin" && g !== "public" && (
                      <button
                        className="GroupsAdminPageDeleteModal-confirmBtn px-4 py-1 rounded bg-red-700 hover:bg-red-800 text-white font-semibold shadow border border-red-900"
                        onClick={() => {
                          removeGroup(g);
                          setConfirmDelete(null);
                        }}
                      >
                        Yes, Delete
                      </button>
                    )}
                    <button
                      className="GroupsAdminPageDeleteModal-cancelBtn px-4 py-1 rounded bg-gray-700 hover:bg-gray-800 text-white font-semibold shadow border border-gray-900"
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
        className="GroupsAdminPage-addForm flex gap-2"
      >
        <input
          className="GroupsAdminPage-addInput px-2 py-1 rounded border border-gray-700 bg-gray-900 text-indigo-100 text-sm mb-1 flex-1"
          placeholder="New group name"
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
        />
        <button
          className="GroupsAdminPage-addBtn bg-indigo-600 text-white font-bold px-6 py-2 rounded-lg shadow hover:bg-indigo-700 transition disabled:opacity-50 text-lg border border-indigo-700"
          type="submit"
        >
          Add Group
        </button>
      </form>
    </div>
  );
};

export default GroupsAdminPage;
