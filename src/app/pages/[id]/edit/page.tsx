"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import PageEditor from "../../../../PageEditor";
import { WikiPage } from "../../../../types";
import { useUser } from "../../../../userContext";

export default function EditPage({ params }: { params: { id: string } }) {
  const { user } = useUser();
  const router = useRouter();
  const [page, setPage] = useState<WikiPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/pages/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch page");
        return res.json();
      })
      .then((data) => setPage(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="text-indigo-400 p-8">Loading...</div>;
  if (error) return <div className="text-red-400 p-8">{error}</div>;
  if (!page) return <div className="text-red-400 p-8">Page not found</div>;

  return (
    <div className="min-h-screen min-w-0 w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 flex">
      <main className="flex-1 flex flex-col items-stretch justify-start p-0 min-h-0 min-w-0 h-full w-full">
        <div className="w-full h-full flex-1 flex flex-col min-h-0 min-w-0">
          <PageEditor
            mode="edit"
            page={page}
            onSuccess={() => router.push(`/pages/${params.id}`)}
            onCancel={() => router.push(`/pages/${params.id}`)}
          />
        </div>
      </main>
    </div>
  );
}
