"use client";

import React, { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export type User = {
  id: string;
  name: string;
  username: string;
  groups: string[];
};

const PUBLIC_USER: User = { 
  id: "anonymous",
  name: "Guest", 
  username: "guest",
  groups: ["public"]
};

interface UserContextType {
  user: User;
  isLoading: boolean;
  refetchSession: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(PUBLIC_USER);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  const fetchSession = async () => {
    try {
      const response = await fetch("/api/auth/session", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json();

      if (data.user) {
        setUser({
          id: data.user.id,
          name: data.user.name || data.user.username || data.user.email?.split('@')[0] || 'User',
          username: data.user.username || data.user.email?.split('@')[0] || 'user',
          groups: data.user.groups || [],
        });
      } else {
        setUser(PUBLIC_USER);
      }
    } catch (error) {
      console.error("Error fetching session:", error);
      setUser(PUBLIC_USER);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch session on mount
  useEffect(() => {
    fetchSession();
  }, []);

  // Refetch session when pathname changes (e.g., after signout redirect)
  useEffect(() => {
    if (!isLoading) {
      fetchSession();
    }
  }, [pathname]);

  return (
    <UserContext.Provider value={{ user, isLoading, refetchSession: fetchSession }}>
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
