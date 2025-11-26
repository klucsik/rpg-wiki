// Central place for group definitions and context
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Group = string;

interface GroupsContextType {
  groups: Group[];
  addGroup: (group: Group) => Promise<void>;
  removeGroup: (group: Group) => void;
}

const GroupsContext = createContext<GroupsContextType | undefined>(undefined);

export function GroupsProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    fetch("/api/groups")
      .then((res) => res.json())
      .then((data) => setGroups(data.map((g: { name: string }) => g.name)));
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
    }
  };
  const removeGroup = async (group: Group) => {
    // Prevent deletion of 'admin' and 'public' groups
    if (group === 'admin' || group === 'public') return;
    // Call API to delete group by name
    await fetch(`/api/groups?name=${encodeURIComponent(group)}`, { method: "DELETE" });
    setGroups((prev) => prev.filter((g) => g !== group));
  };

  return (
    <GroupsContext.Provider value={{ groups, addGroup, removeGroup }}>
      {children}
    </GroupsContext.Provider>
  );
}

export function useGroups() {
  const ctx = useContext(GroupsContext);
  if (!ctx) throw new Error("useGroups must be used within a GroupsProvider");
  return ctx;
}
