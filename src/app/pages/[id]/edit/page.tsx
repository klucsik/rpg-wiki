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
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editGroups, setEditGroups] = useState<string[]>([]);
  const [viewGroups, setViewGroups] = useState<string[]>([]);
  const [path, setPath] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/pages/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch page");
        return res.json();
      })
      .then((data) => {
        setPage(data);
        setTitle(data.title);
        setContent(data.content);
        setEditGroups(data.edit_groups || []);
        setViewGroups(data.view_groups || []);
        setPath(data.path || "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleSave() {
    if (!title || !content) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/pages/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          edit_groups: editGroups,
          view_groups: viewGroups,
          path,
        }),
      });
      if (!res.ok) throw new Error("Failed to update page");
      router.push(`/pages/${params.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/pages/${params.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete page");
      router.push("/pages");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-indigo-400 p-8">Loading...</div>;
  if (error) return <div className="text-red-400 p-8">{error}</div>;
  if (!page) return <div className="text-red-400 p-8">Page not found</div>;

  return (
    <div className="w-full h-full min-h-screen flex flex-1 bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="w-full h-full flex-1 flex flex-col min-h-0">
        <PageEditor
          mode="edit"
          title={title}
          content={content}
          setTitle={setTitle}
          setContent={setContent}
          onSave={handleSave}
          onCancel={() => router.push(`/pages/${params.id}`)}
          saving={saving}
          slug={params.id}
          editGroups={editGroups}
          setEditGroups={setEditGroups}
          viewGroups={viewGroups}
          setViewGroups={setViewGroups}
          path={path}
          setPath={setPath}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
