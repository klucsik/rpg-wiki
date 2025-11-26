"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ChangelogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [changelogContent, setChangelogContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/admin/changelog');
      return;
    }

    if (status === 'authenticated') {
      fetchChangelog();
    }
  }, [status, router]);

  async function fetchChangelog() {
    try {
      const response = await fetch('/api/admin/changelog');
      if (response.status === 401) {
        router.push('/auth/signin?callbackUrl=/admin/changelog');
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch changelog');
      }
      const data = await response.json();
      setChangelogContent(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-4xl font-bold text-indigo-100">Changelog</h1>
            <Link 
              href="/admin"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition font-medium"
            >
              ← Back to Admin
            </Link>
          </div>
          
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            {status === 'loading' || loading ? (
              <div className="text-center text-indigo-200">
                <p>Loading changelog...</p>
              </div>
            ) : error ? (
              <div className="text-center text-red-400">
                <p>Error loading changelog: {error}</p>
              </div>
            ) : (
              <div 
                className="prose prose-invert prose-indigo max-w-none"
                dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(changelogContent) }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function convertMarkdownToHtml(markdown: string): string {
  return markdown
    // Convert headers
    .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold text-indigo-100 mb-6 border-b border-gray-600 pb-2">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-semibold text-indigo-200 mb-4 mt-8">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-medium text-indigo-300 mb-3 mt-6">$1</h3>')
    // Convert bullet points
    .replace(/^- (.+)$/gm, '<li class="mb-2 text-indigo-100">$1</li>')
    // Wrap consecutive list items in ul tags
    .replace(/(<li.*<\/li>\s*)+/g, (match) => `<ul class="list-disc list-inside mb-6 space-y-2 ml-4">${match}</ul>`)
    // Convert line breaks to paragraphs
    .split('\n\n')
    .map(paragraph => {
      if (paragraph.startsWith('<h') || paragraph.startsWith('<ul')) {
        return paragraph;
      }
      if (paragraph.trim()) {
        return `<p class="mb-4 text-indigo-100 leading-relaxed">${paragraph.trim()}</p>`;
      }
      return '';
    })
    .join('\n');
}
