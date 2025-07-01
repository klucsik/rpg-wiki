"use client";

import { useSession } from "next-auth/react";
import { useUser } from "../../userContext";

export default function DebugPage() {
  const { data: session, status } = useSession();
  const { user, isLoading } = useUser();

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-6">Debug: Authentication Status</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-3 text-indigo-300">NextAuth Session</h2>
          <div className="text-sm">
            <p><strong>Status:</strong> {status}</p>
            <p><strong>Loading:</strong> {status === "loading" ? "Yes" : "No"}</p>
            <div className="mt-3">
              <strong>Session Data:</strong>
              <pre className="bg-gray-700 p-2 rounded mt-1 text-xs overflow-auto">
                {JSON.stringify(session, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-3 text-indigo-300">Custom User Context</h2>
          <div className="text-sm">
            <p><strong>Loading:</strong> {isLoading ? "Yes" : "No"}</p>
            <div className="mt-3">
              <strong>User Data:</strong>
              <pre className="bg-gray-700 p-2 rounded mt-1 text-xs overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-gray-800 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-3 text-indigo-300">Test Credentials</h2>
        <p className="text-sm text-gray-300">
          Try logging in with: <code className="bg-gray-700 px-2 py-1 rounded">admin</code> / <code className="bg-gray-700 px-2 py-1 rounded">admin123</code>
        </p>
      </div>

      <div className="mt-6">
        <a 
          href="/api/auth/signin" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition"
        >
          Go to Sign In
        </a>
      </div>
    </div>
  );
}
