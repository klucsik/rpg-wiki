"use client";
import React, { useEffect, useState } from "react";
import PageList from "../../PageList";
import { WikiPage } from "../../types";
import { useUser } from "../../userContext";
import { canUserViewPage } from "../../accessControl";
import { parseHtmlWithRestrictedBlocks } from "../pageviewer";

function ShareButton({ pageId }: { pageId: number }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/pages/${pageId}` : "";
  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="bg-blue-700 text-white px-3 py-1 rounded font-semibold shadow hover:bg-blue-800 transition text-sm ml-2"
      title="Copy link to this page"
      type="button"
    >
      {copied ? "Link copied!" : "Share"}
    </button>
  );
}

export default function Pages() {
  const { user } = useUser();
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch("/api/pages")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch pages");
        return res.json();
      })
      .then((data) => setPages(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const selectedPage = pages.find((p) => p.id === selectedId) || null;
  const canViewSelected = selectedPage && canUserViewPage(user, selectedPage);

  function handleSelect(id: number) {
    setSelectedId(id);
    setEditId(null);
    setShowCreate(false);
  }

  function handleEdit(id: number) {
    const page = pages.find((p) => p.id === id);
    if (!page) return;
    setEditId(id);
    setEditTitle(page.title);
    setEditContent(page.content);
    setShowCreate(false);
  }

  function handleCreate() {
    setShowCreate(true);
    setEditId(null);
    setEditTitle("");
    setEditContent("");
  }

  async function saveEdit() {
    if (!editId || !editTitle || !editContent) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/pages/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, content: editContent }),
      });
      if (!res.ok) throw new Error("Failed to update page");
      const updated = await res.json();
      setPages((pages) => pages.map((p) => (p.id === editId ? updated : p)));
      setEditId(null);
      setEditTitle("");
      setEditContent("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveCreate() {
    if (!newTitle || !newContent) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, content: newContent }),
      });
      if (!res.ok) throw new Error("Failed to add page");
      const created = await res.json();
      setPages((pages) => [...pages, created]);
      setNewTitle("");
      setNewContent("");
      setShowCreate(false);
      setSelectedId(created.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deletePage(id: number) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/pages/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete page");
      setPages((pages) => pages.filter((p) => p.id !== id));
      if (selectedId === id) setSelectedId(null);
      if (editId === id) setEditId(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen min-w-0 w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 flex">
      <PageList
        pages={pages}
        onSelect={handleSelect}
        selectedId={selectedId}
        onDelete={deletePage}
        onEdit={handleEdit}
        saving={saving}
      />
      <main className="flex-1 flex flex-col items-stretch justify-start p-0 min-h-0 min-w-0 h-full w-full">
        <div className="w-full h-full flex-1 flex flex-col min-h-0 min-w-0">
          {loading && <div className="text-indigo-400">Loading...</div>}
          {error && (
            <div className="text-red-400 font-semibold mb-2">{error}</div>
          )}
          {selectedPage && canViewSelected && (
            <div className="prose prose-invert w-full h-full flex-1 mx-0 bg-gray-900/80 rounded-none p-8 shadow-lg border border-gray-800 flex flex-col min-h-0 min-w-0 overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-indigo-200">
                  {selectedPage.title}
                </h2>
                <div className="flex items-center gap-2">
                  {user.group !== "public" &&
                    Array.isArray(selectedPage.edit_groups) &&
                    selectedPage.edit_groups.includes(user.group) && (
                      <button
                        onClick={() => handleEdit(selectedPage.id)}
                        className="bg-yellow-700 text-white px-3 py-1 rounded font-semibold shadow hover:bg-yellow-800 transition text-sm"
                      >
                        Edit
                      </button>
                    )}
                  <ShareButton pageId={selectedPage.id} />
                </div>
              </div>
              <div className="flex-1 overflow-auto min-h-0 min-w-0">
                {selectedPage.content ? (
                  parseHtmlWithRestrictedBlocks(selectedPage.content, {
                    groups: user.groups || [user.group],
                  })
                ) : (
                  <div>No content</div>
                )}
              </div>
              <div className="mt-6 text-xs text-gray-500">
                Last updated:{" "}
                {selectedPage.updated_at
                  ? new Date(selectedPage.updated_at).toLocaleString()
                  : ""}
              </div>
            </div>
          )}
          {selectedPage && !canViewSelected && (
            <div className="flex items-center justify-center min-h-full">
              <div className="bg-gray-900/90 border border-gray-800 rounded-lg p-10 shadow-lg text-center">
                <h1 className="text-3xl font-bold text-red-400 mb-4">No Access</h1>
                <p className="text-indigo-100 mb-2">
                  You do not have permission to view this page.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
