"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

export type User = {
  name: string;
  group: string;
};

const PREDEFINED_USERS: User[] = [
  { name: "Alice", group: "admin" },
  { name: "Bob", group: "editor" },
  { name: "Charlie", group: "viewer" },
];

const PUBLIC_USER: User = { name: "Guest", group: "public" };

interface UserContextType {
  user: User;
  setUser: (user: User) => void;
  logout: () => void;
  users: User[];
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(PUBLIC_USER);

  const logout = () => setUser(PUBLIC_USER);

  return (
    <UserContext.Provider value={{ user, setUser, logout, users: PREDEFINED_USERS }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}
