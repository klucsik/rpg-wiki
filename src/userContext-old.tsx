"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type User = {
  id?: number;
  name: string;
  group: string;
  groups?: string[];
};

const PUBLIC_USER: User = { name: "Guest", group: "public", groups: ["public"] };

interface UserContextType {
  user: User;
  setUser: (user: User) => void;
  logout: () => void;
  users: User[];
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User>(PUBLIC_USER);

  useEffect(() => {
    // On mount, check for persisted login
    const stored = window.localStorage.getItem("rpgwiki_user");
    const expiry = window.localStorage.getItem("rpgwiki_user_expiry");
    if (stored && expiry && Date.now() < Number(expiry)) {
      setUserState(JSON.parse(stored));
    }
  }, []);

  React.useEffect(() => {
    // Update user state if localStorage changes (e.g., after login)
    const onStorage = () => {
      const stored = window.localStorage.getItem("rpgwiki_user");
      const expiry = window.localStorage.getItem("rpgwiki_user_expiry");
      if (stored && expiry && Date.now() < Number(expiry)) {
        setUserState(JSON.parse(stored));
      } else {
        setUserState(PUBLIC_USER);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setUser = (user: User) => {
    setUserState(user);
    if (user.group !== "public") {
      window.localStorage.setItem("rpgwiki_user", JSON.stringify(user));
      window.localStorage.setItem("rpgwiki_user_expiry", (Date.now() + 86400000).toString());
    } else {
      window.localStorage.removeItem("rpgwiki_user");
      window.localStorage.removeItem("rpgwiki_user_expiry");
    }
  };

  const logout = () => setUser(PUBLIC_USER);

  // users is now just a placeholder for admin UI
  const users: User[] = [];

  return (
    <UserContext.Provider value={{ user, setUser, logout, users }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}
