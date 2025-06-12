"use client";
import React, { useEffect, useState } from "react";
import PageList from "../PageList";
import PageViewer from "../PageViewer";
import { WikiPage } from "../types";

export default function Pages() {
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
		<div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 py-10 px-4 flex">
			<PageList
				pages={pages}
				onSelect={handleSelect}
				selectedId={selectedId}
				onDelete={deletePage}
				onEdit={handleEdit}
				saving={saving}
			/>
			<main className="flex-1 flex flex-col items-center justify-start p-8">
				<div className="w-full max-w-2xl">
					{loading && <div className="text-indigo-400">Loading...</div>}
					{error && (
						<div className="text-red-400 font-semibold mb-2">{error}</div>
					)}
					<PageViewer page={selectedPage} />
				</div>
			</main>
		</div>
	);
}
