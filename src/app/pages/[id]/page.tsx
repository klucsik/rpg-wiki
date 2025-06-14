"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PageViewer from "../../../PageViewer";
import { WikiPage } from "../../../types";
import { useUser } from "../../../userContext";

export default function PageRoute() {
  const params = useParams();
  const id = params?.id as string;
  const [page, setPage] = useState<WikiPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();
  const [noAccess, setNoAccess] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/pages/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch page");
        return res.json();
      })
      .then((data: WikiPage) => {
        setPage(data);
        // Restriction logic: user must be in view_groups or edit_groups
        const canView = Array.isArray(data.view_groups)
          ? data.view_groups.includes(user.group)
          : true;
        const canEdit = Array.isArray(data.edit_groups)
          ? data.edit_groups.includes(user.group)
          : false;
        setNoAccess(!canView && !canEdit);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, user.group]);

  if (loading) return <div className="text-indigo-400 p-8">Loading...</div>;
  if (error) return <div className="text-red-400 p-8">{error}</div>;
  if (noAccess) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="bg-gray-900/90 border border-gray-800 rounded-lg p-10 shadow-lg text-center">
        <h1 className="text-3xl font-bold text-red-400 mb-4">No Access</h1>
        <p className="text-indigo-100 mb-2">You do not have permission to view this page.</p>
      </div>
    </div>
  );

  if (!page) return null;

  return <PageViewer page={page} />;
}
