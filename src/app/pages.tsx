"use client";
import React, { useState, useEffect } from "react";
import { TiptapEditor } from "../TiptapEditor";
import Link from "next/link";
import { WikiPage } from "../types";

export default function Pages() {
	const [pages, setPages] = useState<WikiPage[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [newTitle, setNewTitle] = useState("");
	const [newContent, setNewContent] = useState("");
	const [editId, setEditId] = useState<number | null>(null);
	const [editTitle, setEditTitle] = useState("");
	const [editContent, setEditContent] = useState("");
	const [saving, setSaving] = useState(false);

	// Fetch all pages from API
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

	function startEdit(page: WikiPage) {
		setEditId(page.id);
		setEditTitle(page.title);
		setEditContent(page.content);
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

	async function addPage() {
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
		} catch (err: any) {
			setError(err.message);
		} finally {
			setSaving(false);
		}
	}

	return (
		<div>
			<h2>Pages</h2>
			{loading && <div>Loading...</div>}
			{error && <div style={{ color: "red" }}>{error}</div>}
			<div style={{ display: "flex", gap: 32 }}>
				<div>
					<h3>All Pages</h3>
					<ul>
						{pages.map((p) => (
							<li key={p.id}>
								<Link href={`/pages/${encodeURIComponent(p.id)}`}>{p.title}</Link>
								<button
									onClick={() => deletePage(p.id)}
									style={{ marginLeft: 8, color: "red" }}
									disabled={saving}
								>
									Delete
								</button>
								<button onClick={() => startEdit(p)} style={{ marginLeft: 8 }} disabled={saving}>
									Edit
								</button>
							</li>
						))}
					</ul>
					<h4>Add New Page</h4>
					<input
						value={newTitle}
						onChange={(e) => setNewTitle(e.target.value)}
						placeholder="Title"
						disabled={saving}
					/>
					<TiptapEditor value={newContent} onChange={setNewContent} />
					<button onClick={addPage} disabled={saving}>
						Add Page
					</button>
				</div>
				<div style={{ flex: 1 }}>
					{editId ? (
						<div>
							<h3>Edit Page</h3>
							<input
								value={editTitle}
								onChange={(e) => setEditTitle(e.target.value)}
								placeholder="Title"
								disabled={saving}
							/>
							<TiptapEditor value={editContent} onChange={setEditContent} />
							<button onClick={saveEdit} disabled={saving}>Save</button>
							<button
								onClick={() => setEditId(null)}
								style={{ marginLeft: 8 }}
								disabled={saving}
							>
								Cancel
							</button>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
