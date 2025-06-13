import React from "react";
import PageList from "./PageList";
import { useRouter } from "next/navigation";
import { WikiPage } from "../types";
import { useUser } from "./userContext";

export default function PageViewerLayout({ page }: { page: any }) {
  const router = useRouter();
  const { user } = useUser();
  // We'll need to fetch all pages for the sidebar
  const [pages, setPages] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    setLoading(true);
    fetch("/api/pages")
      .then((res) => res.json())
      .then((data) => setPages(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 py-10 px-4 flex">
      <PageList
        pages={pages}
        onSelect={(id: number) => router.push(`/pages/${id}`)}
        selectedId={page?.id || null}
        onDelete={() => {}}
        onEdit={(id: number) => router.push(`/pages/${id}/edit`)}
        saving={false}
      />
      <main className="flex-1 flex flex-col items-center justify-start p-8">
        <div className="w-full max-w-2xl">
          <div className="prose prose-invert max-w-2xl mx-auto bg-gray-900/80 rounded-lg p-8 shadow-lg border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-indigo-200">{page?.title}</h2>
              {user.group !== "public" && (
                <button
                  onClick={() => router.push(`/pages/${page?.id}/edit`)}
                  className="bg-yellow-700 text-white px-3 py-1 rounded font-semibold shadow hover:bg-yellow-800 transition text-sm"
                >
                  Edit
                </button>
              )}
            </div>
            <div dangerouslySetInnerHTML={{ __html: page?.content || "" }} />
            <div className="mt-6 text-xs text-gray-500">
              Last updated: {page?.updated_at ? new Date(page.updated_at).toLocaleString() : ""}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
