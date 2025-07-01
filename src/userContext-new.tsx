"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useSession } from "next-auth/react";

export type User = {
  id: string;
  name: string;
  username: string;
  group: string;
  groups: string[];
};

const PUBLIC_USER: User = { 
  id: "anonymous",
  name: "Guest", 
  username: "guest",
  group: "public", 
  groups: ["public"] 
};

interface UserContextType {
  user: User;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  const user: User = session?.user ? {
    id: session.user.id,
    name: session.user.name || session.user.username,
    username: session.user.username,
    group: session.user.primaryGroup,
    groups: session.user.groups,
  } : PUBLIC_USER;

  const isLoading = status === "loading";

  return (
    <UserContext.Provider value={{ user, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
