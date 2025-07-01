"use client";

import { signOut } from "next-auth/react";
import { useEffect } from "react";

export default function SignOut() {
  useEffect(() => {
    signOut({ callbackUrl: "/" });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Signing out...</h2>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
      </div>
    </div>
  );
}
