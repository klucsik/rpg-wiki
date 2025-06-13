"use client";

import React, { useState } from "react";
import { useGroups } from "../../groupsContext";
import { styleTokens } from "../../PageEditor";

const GroupsAdminPage = () => {
  const { groups, addGroup, removeGroup, renameGroup } = useGroups();
  const [newGroup, setNewGroup] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  return (
    <div className={styleTokens.card}>
      <h1 className="text-2xl font-bold mb-4">Manage Groups</h1>
      <ul className="mb-6">
        {groups.map((g: string) => (
          <li key={g} className="flex items-center gap-2 mb-2">
            {editing === g ? (
              <>
                <input
                  className={styleTokens.input}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  autoFocus
                />
                <button
                  className={styleTokens.button + " btn btn-sm"}
                  onClick={() => {
                    renameGroup(g, editValue);
                    setEditing(null);
                  }}
                >
                  Save
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <span className="font-mono text-lg">{g}</span>
                <button
                  className={styleTokens.button + " btn btn-sm"}
                  onClick={() => {
                    setEditing(g);
                    setEditValue(g);
                  }}
                >
                  Rename
                </button>
                <button
                  className="btn btn-sm text-red-600"
                  onClick={() => removeGroup(g)}
                >
                  Delete
                </button>
              </>
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
        <button className={styleTokens.button + " btn btn-primary"} type="submit">
          Add Group
        </button>
      </form>
    </div>
  );
};

export default GroupsAdminPage;
