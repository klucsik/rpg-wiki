"use client";
import React, { useState, useEffect } from "react";
import PageEditor from "../../../PageEditor";
import { useRouter } from "next/navigation";
import { useUser } from "../../../userContext";

export default function CreatePage() {
  const { user } = useUser();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editGroups, setEditGroups] = useState<string[]>(user.group ? [user.group] : []);
  const [viewGroups, setViewGroups] = useState<string[]>(user.group ? [user.group] : []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [path, setPath] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (user.group === "public") {
      router.replace("/login");
    }
  }, [user, router]);

  async function saveCreate() {
    if (!title || !content || !path) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, edit_groups: editGroups, view_groups: viewGroups, path }),
      });
      if (!res.ok) throw new Error("Failed to add page");
      const created = await res.json();
      router.push(`/pages/${created.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageEditor
      mode="create"
      path={path}
      setPath={setPath}
      title={title}
      setTitle={setTitle}
      content={content}
      setContent={setContent}
      onSave={saveCreate}
      onCancel={() => router.push("/pages")}
      saving={saving}
      editGroups={editGroups}
      setEditGroups={setEditGroups}
      viewGroups={viewGroups}
      setViewGroups={setViewGroups}
    />
  );
}
