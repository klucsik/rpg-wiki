import React from "react";
import PageList from "./PageList";
import { useRouter } from "next/navigation";
import { WikiPage } from "./types";
import { useUser } from "./userContext";
import { parseHtmlWithRestrictedBlocks } from "./app/pageviewer";
import { canUserViewPage, canUserEditPage } from "./accessControl";
import VersionHistory from "./VersionHistory";
import styles from "./PageView.module.css";
import { authenticatedFetch } from "./apiHelpers";

function NoAccessPage() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-screen">
      <div className="bg-gray-900/90 border border-gray-800 rounded-lg p-10 shadow-lg text-center">
        <h1 className="text-3xl font-bold text-red-400 mb-4">No Access</h1>
        <p className="text-indigo-100 mb-2">You do not have permission to view this page.</p>
      </div>
    </div>
  );
}

export default function PageViewerLayout({ page }: { page: WikiPage }) {
  const router = useRouter();
  const { user } = useUser();
  const [showHistory, setShowHistory] = React.useState(false);
  // We'll need to fetch all pages for the sidebar
  const [pages, setPages] = React.useState<WikiPage[]>([]);
  
  React.useEffect(() => {
    authenticatedFetch("/api/pages", user)
      .then((res) => res.json())
      .then((data) => setPages(data));
  }, [user]);

  // Restriction logic: user must be in view_groups or edit_groups
  const canView = canUserViewPage(user, page);
  const canEdit = canUserEditPage(user, page);
  
  if (!canView && !canEdit) {
    return <NoAccessPage />;
  }

  // For parseHtmlWithRestrictedBlocks, pass user as { groups: [user.group] }
  return (
    <div className={styles.container}>
      <PageList
        pages={pages}
        selectedId={page?.id || null}
      />
      <main className={styles.main + " flex-col items-center justify-start p-8"}>
        {/* Very visible debug banner */}
        <div className="w-full bg-red-900 text-white p-4 mb-4 rounded border-2 border-red-500">
          <h3 className="font-bold">DEBUG INFO:</h3>
          <div>User: {JSON.stringify(user)}</div>
          <div>CanEdit: {canEdit ? 'TRUE' : 'FALSE'}</div>
          <div>Page ID: {page?.id}</div>
          <div>Edit Groups: {JSON.stringify(page?.edit_groups)}</div>
        </div>
        
        <div className="w-full max-w-2xl">
          <div className={`prose prose-invert ${styles.proseBox}`}>
            <div className={styles.header}>
              <h2 className="text-2xl font-bold text-indigo-200">{page?.title}</h2>
              <div className="flex gap-2">
                {/* Always show the View History button for testing */}
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition border border-blue-800"
                >
                  {showHistory ? 'Hide History' : 'View History'}
                </button>
                
                {user.group !== "public" && canEdit && (
                  <button
                    onClick={() => {
                      if (!page?.id) {
                        return;
                      }
                      router.push(`/pages/${page.id}/edit`);
                    }}
                    className={styles.editButton}
                    disabled={!page?.id}
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
            
            {/* Show version history if requested */}
            {showHistory && page?.id && (
              <div className="mb-6">
                <VersionHistory 
                  pageId={page.id} 
                  onClose={() => setShowHistory(false)}
                />
              </div>
            )}
            
            {/* Render restricted blocks if present, else fallback to normal content */}
            {page?.content ? (
              parseHtmlWithRestrictedBlocks(page.content, { groups: [user.group] })
            ) : (
              <div>No content</div>
            )}
            <div className={styles.lastUpdated}>
              Last updated: {page?.updated_at ? new Date(page.updated_at).toLocaleString() : ""}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
