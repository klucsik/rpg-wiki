"use client";

import { signOut } from "@/lib/better-auth-client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SignOut() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function doSignOut() {
      setIsSigningOut(true);
      try {
        await signOut();
      } finally {
        // Redirect to login page after signout
        router.replace("/auth/signin");
      }
    }
    doSignOut();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-4" data-testid="signout-message">
          {isSigningOut ? "Signing out..." : "Sign Out"}
        </h2>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
      </div>
    </div>
  );
}
