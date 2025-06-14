"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageEditor from "../../../../PageEditor";
import { WikiPage } from "../../../../types";
import { useUser } from "../../../../userContext";

export default function EditPage() {
  const { user } = useUser();
  const params = useParams();
  const router = useRouter();
  const slug = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editGroups, setEditGroups] = useState<string[]>(user.group ? [user.group] : []);
  const [viewGroups, setViewGroups] = useState<string[]>(user.group ? [user.group] : []);
  const [saving, setSaving] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (user.group === "public") {
      router.replace("/login");
    }
  }, [user, router, slug]);

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
        setEditGroups(data.edit_groups || (user.group ? [user.group] : []));
        setViewGroups(data.view_groups || (user.group ? [user.group] : []));
        setAllowed(Array.isArray(data.edit_groups) ? data.edit_groups.includes(user.group) : true);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug, user.group]);

  useEffect(() => {
    if (allowed === false) {
      router.replace(`/pages/${slug}`);
    }
  }, [allowed, router, slug]);

  async function saveEdit() {
    if (!title || !content) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/pages/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, edit_groups: editGroups, view_groups: viewGroups }),
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
  if (allowed === false) return null;

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
      editGroups={editGroups}
      setEditGroups={setEditGroups}
      viewGroups={viewGroups}
      setViewGroups={setViewGroups}
    />
  );
}
