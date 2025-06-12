"use client";
import React, { useState } from "react";
import { useUser } from "./userContext";

export default function UserMenu() {
  const { user, setUser, logout, users } = useUser();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      {user.group !== "public" ? (
        <button
          className="bg-gray-800 text-indigo-100 px-3 py-1 rounded flex items-center gap-2 hover:bg-gray-700 border border-gray-700"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="font-semibold">{user.name}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-indigo-700 text-white ml-1">{user.group}</span>
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>
      ) : (
        <button
          className="bg-indigo-700 text-white px-4 py-1 rounded font-semibold hover:bg-indigo-800 border border-indigo-800"
          onClick={() => setOpen((o) => !o)}
        >
          Login
        </button>
      )}
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded shadow-lg z-50">
          {user.group === "public" ? (
            <div className="py-2">
              {users.map((u) => (
                <button
                  key={u.name}
                  className="w-full text-left px-4 py-2 hover:bg-gray-800 text-indigo-100"
                  onClick={() => {
                    setUser(u);
                    setOpen(false);
                  }}
                >
                  {u.name} <span className="ml-2 text-xs text-indigo-400">({u.group})</span>
                </button>
              ))}
            </div>
          ) : (
            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-800 text-red-300"
              onClick={() => {
                logout();
                setOpen(false);
              }}
            >
              Logout
            </button>
          )}
        </div>
      )}
    </div>
  );
}
