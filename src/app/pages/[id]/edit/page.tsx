"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageEditor from "../../../../PageEditor";
import { WikiPage } from "../../../../types";

export default function EditPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/pages/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch page");
        return res.json();
      })
      .then((data: WikiPage) => {
        setTitle(data.title);
        setContent(data.content);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  async function saveEdit() {
    if (!title || !content) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/pages/${slug}` , {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      if (!res.ok) throw new Error("Failed to update page");
      router.push(`/pages/${slug}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-indigo-400 p-8">Loading...</div>;
  if (error) return <div className="text-red-400 p-8">{error}</div>;

  return (
    <PageEditor
      mode="edit"
      title={title}
      content={content}
      setTitle={setTitle}
      setContent={setContent}
      onSave={saveEdit}
      onCancel={() => router.push(`/pages/${slug}`)}
      saving={saving}
      slug={slug}
    />
  );
}
