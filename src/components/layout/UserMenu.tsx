"use client";
import React, { useState } from "react";
import { useUser } from "../../features/auth/userContext";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { isUserAuthenticated } from "../../features/auth/accessControl";

export default function UserMenu() {
  const { user } = useUser();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      {isUserAuthenticated(user) ? (
        <button
          className="bg-gray-800 text-indigo-100 px-2 sm:px-3 py-1 rounded flex items-center gap-1 sm:gap-2 hover:bg-gray-700 border border-gray-700 min-w-0 max-w-xs"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="font-semibold truncate">{user.name}</span>
          <span className="text-xs px-1 sm:px-2 py-0.5 rounded bg-indigo-700 text-white ml-1 truncate max-w-20 sm:max-w-none">
            {user.groups.slice(0, 2).join(", ")}{user.groups.length > 2 ? "..." : ""}
          </span>
          <svg className="w-4 h-4 ml-1 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>
      ) : (
        <Link href="/auth/signin">
          <button
            className="bg-indigo-700 text-white px-3 sm:px-4 py-1 rounded font-semibold hover:bg-indigo-800 border border-indigo-800"
          >
            Login
          </button>
        </Link>
      )}
      {open && isUserAuthenticated(user) && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded shadow-lg z-50">
          <div className="px-4 py-2 border-b border-gray-700 text-sm">
            <div className="font-semibold text-indigo-200 truncate">{user.name}</div>
            <div className="text-xs text-gray-400 truncate">Groups: {user.groups.join(", ")}</div>
          </div>
          <button
            className="w-full text-left px-4 py-2 hover:bg-gray-800 text-red-300"
            onClick={() => {
              signOut({ callbackUrl: "/" });
              setOpen(false);
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
