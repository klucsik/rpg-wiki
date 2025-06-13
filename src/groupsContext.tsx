// Central place for group definitions and context
import React, { createContext, useContext, useState, ReactNode } from "react";

export type Group = string;

interface GroupsContextType {
  groups: Group[];
  addGroup: (group: Group) => void;
  removeGroup: (group: Group) => void;
  renameGroup: (oldName: Group, newName: Group) => void;
}

const DEFAULT_GROUPS: Group[] = ["admin", "editor", "viewer", "public"];

const GroupsContext = createContext<GroupsContextType | undefined>(undefined);

export function GroupsProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<Group[]>(DEFAULT_GROUPS);

  const addGroup = (group: Group) => {
    setGroups((prev) => (prev.includes(group) ? prev : [...prev, group]));
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
