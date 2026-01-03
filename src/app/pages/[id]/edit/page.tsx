"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { PageEditor } from "../../../../components/editor";
import { WikiPage } from "../../../../types";
import { useUser, canUserEditPage, isUserAuthenticated } from "../../../../features/auth";

export default function EditPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: userLoading } = useUser();
  const id = params?.id as string;
  const [page, setPage] = useState<WikiPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasRedirected = useRef(false);

  // Redirect unauthenticated users to login, but only after user context has loaded
  useEffect(() => {
    if (userLoading) return; // Wait for user context to load
    if (hasRedirected.current) return; // Prevent multiple redirects
    
    if (!isUserAuthenticated(user)) {
      hasRedirected.current = true;
      router.push("/login");
      return;
    }
  }, [user, userLoading, router]);

  // Fetch page data only for authenticated users, but only once or when user changes
  useEffect(() => {
    if (userLoading) return; // Wait for user context to load
    if (!isUserAuthenticated(user)) return; // Will redirect above
    if (page && page.id.toString() === id) return; // Don't refetch if we already have the right page
    
    fetch(`/api/pages/${id}/edit?draft=true`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch page");
        return res.json();
      })
      .then((data) => setPage(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, userLoading, user, page]); // Added missing dependencies

  // Show loading state while user context is loading or redirecting unauthenticated users
  if (userLoading || !isUserAuthenticated(user)) {
    return <div className="text-indigo-400 p-8">Loading...</div>;
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
