// Central place for group definitions and context
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Group = string;

interface GroupsContextType {
  groups: Group[];
  addGroup: (group: Group) => Promise<void>;
  removeGroup: (group: Group) => void;
  renameGroup: (oldName: Group, newName: Group) => void;
}

const GroupsContext = createContext<GroupsContextType | undefined>(undefined);

export function GroupsProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    fetch("/api/groups")
      .then((res) => res.json())
      .then((data) => setGroups(data.map((g: any) => g.name)));
  }, []);

  const addGroup = async (group: Group) => {
    if (!group) return;
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: group }),
    });
    if (res.ok) {
      setGroups((prev) => (prev.includes(group) ? prev : [...prev, group]));
    } else {
      // Optionally handle error
    }
  };
  const removeGroup = (group: Group) => {
    setGroups((prev) => prev.filter((g) => g !== group));
  };
  const renameGroup = (oldName: Group, newName: Group) => {
    setGroups((prev) => prev.map((g) => (g === oldName ? newName : g)));
  };

  return (
    <GroupsContext.Provider value={{ groups, addGroup, removeGroup, renameGroup }}>
      {children}
    </GroupsContext.Provider>
  );
}

export function useGroups() {
  const ctx = useContext(GroupsContext);
  if (!ctx) throw new Error("useGroups must be used within a GroupsProvider");
  return ctx;
}
