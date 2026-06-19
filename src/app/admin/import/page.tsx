"use client";

import ImportDashboard from "@/features/import-dashboard/ImportDashboard";
import { useUser } from "@/features/auth/userContext";
import { isUserAuthenticated } from "@/features/auth/accessControl";
import Link from "next/link";

export default function AdminImportPage() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="bg-gray-900/90 border border-gray-800 rounded-lg p-10 shadow-lg text-center">
          <h1 className="text-2xl font-bold text-indigo-200 mb-4">Loading...</h1>
          <p className="text-indigo-100">Verifying permissions.</p>
        </div>
      </div>
    );
  }

  if (!isUserAuthenticated(user) || !user.groups?.includes("admin")) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="bg-gray-900/90 border border-gray-800 rounded-lg p-10 shadow-lg text-center">
          <h1 className="text-3xl font-bold text-red-400 mb-4">Unauthorized</h1>
          <p className="text-indigo-100 mb-4">Admin access required.</p>
          <Link href="/auth/signin" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition font-medium">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-900 to-gray-800 p-6 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin" className="text-indigo-400 hover:text-indigo-200 transition text-sm">
          ← Back to Admin
        </Link>
        <h1 className="text-3xl font-bold text-indigo-100">Google Docs Imports</h1>
      </div>
      <ImportDashboard />
    </div>
  );
}
