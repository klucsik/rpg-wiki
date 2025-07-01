"use client";
import React, { useEffect, useState } from "react";
import PageList from "../PageList";
import { WikiPage } from "../types";
import { useUser } from "../userContext";
import { authenticatedFetch } from "../apiHelpers";
import { canUserEditPage } from "../accessControl";

export default function Pages() {
	const { user } = useUser();
	const [pages, setPages] = useState<WikiPage[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	// Restore selectedId state for page selection
	const [selectedId] = React.useState<number | null>(null);

	useEffect(() => {
		setLoading(true);
		setError(null);
		authenticatedFetch("/api/pages")
			.then((res) => {
				if (!res.ok) throw new Error("Failed to fetch pages");
				return res.json();
			})
			.then((data) => setPages(data))
			.catch((err) => setError(err.message))
			.finally(() => setLoading(false));
	}, [user]);

	const selectedPage = pages.find((p) => p.id === selectedId) || null;

	// Restore handleEdit function without parameters
	function handleEdit() {
		// Implement navigation or editing logic here
	}

	return (
		<div className="min-h-screen min-w-0 w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 flex">
			<PageList pages={pages} selectedId={selectedId} />
			<main className="flex-1 flex flex-col items-stretch justify-start p-0 min-h-0 min-w-0 h-full w-full">
				<div className="w-full h-full flex-1 flex flex-col min-h-0 min-w-0">
					{loading && <div className="text-indigo-400">Loading...</div>}
					{error && (
						<div className="text-red-400 font-semibold mb-2">{error}</div>
					)}
					{selectedPage && (
						<div className="prose prose-invert w-full h-full flex-1 mx-0 bg-gray-900/80 rounded-none p-8 shadow-lg border border-gray-800 flex flex-col min-h-0 min-w-0 overflow-auto">
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-2xl font-bold text-indigo-200">
									{selectedPage.title}
								</h2>
								{canUserEditPage(user, selectedPage) && (
									<button
										onClick={handleEdit}
										className="bg-yellow-700 text-white px-3 py-1 rounded font-semibold shadow hover:bg-yellow-800 transition text-sm"
									>
										Edit
									</button>
								)}
							</div>
							<div className="flex-1 overflow-auto min-h-0 min-w-0">
								<div
									dangerouslySetInnerHTML={{ __html: selectedPage.content || "" }}
								/>
							</div>
							<div className="mt-6 text-xs text-gray-500">
								Last updated:{" "}
								{selectedPage.updated_at
									? new Date(selectedPage.updated_at).toLocaleString()
									: ""}
							</div>
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
