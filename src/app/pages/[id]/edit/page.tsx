"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import PageEditor from "../../../../PageEditor";
import { WikiPage } from "../../../../types";
import { useUser } from "../../../../userContext";
import { canUserEditPage } from "../../../../accessControl";

export default function EditPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useUser();
  const id = params?.id as string;
  const [page, setPage] = useState<WikiPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (user.group === "public") {
      router.push("/login");
      return;
    }
  }, [user, router]);

  // Fetch page data only for authenticated users
  useEffect(() => {
    if (user.group === "public") return; // Will redirect above
    
    setLoading(true);
    setError(null);
    fetch(`/api/pages/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch page");
        return res.json();
      })
      .then((data) => setPage(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, user]);

  // Show loading state while redirecting unauthenticated users
  if (user.group === "public") {
    return <div className="text-indigo-400 p-8">Redirecting to login...</div>;
  }

  if (loading) return <div className="text-indigo-400 p-8">Loading...</div>;
  if (error) return <div className="text-red-400 p-8">{error}</div>;
  if (!page) return <div className="text-red-400 p-8">Page not found</div>;

  // Check if user has edit permissions for this specific page
  if (!canUserEditPage(user, page)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="bg-gray-900/90 border border-gray-800 rounded-lg p-10 shadow-lg text-center max-w-md">
          <h1 className="text-3xl font-bold text-red-400 mb-4">Edit Restricted</h1>
          <p className="text-indigo-100 mb-2">You don&apos;t have permission to edit this page.</p>
          <p className="text-indigo-300 text-sm mb-6">
            Only users in the following groups can edit: {page.edit_groups?.join(', ') || 'None'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push(`/pages/${id}`)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded transition-colors font-medium"
            >
              View Page
            </button>
            <button
              onClick={() => router.push('/pages')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded transition-colors font-medium"
            >
              All Pages
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-w-0 w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 flex">
      <main className="flex-1 flex flex-col items-stretch justify-start p-0 min-h-0 min-w-0 h-full w-full">
        <div className="w-full h-full flex-1 flex flex-col min-h-0 min-w-0">
          <PageEditor
            mode="edit"
            page={page}
            onSuccess={() => router.push(`/pages/${id}`)}
            onCancel={() => router.push(`/pages/${id}`)}
          />
        </div>
      </main>
    </div>
  );
}
