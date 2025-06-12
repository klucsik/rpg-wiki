"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PageViewer from "../../../PageViewer";
import { WikiPage } from "../../../types";

export default function PageRoute() {
  const params = useParams();
  const id = params?.id as string;
  const [page, setPage] = useState<WikiPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/pages/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch page");
        return res.json();
      })
      .then((data: WikiPage) => setPage(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-indigo-400 p-8">Loading...</div>;
  if (error) return <div className="text-red-400 p-8">{error}</div>;

  return <PageViewer page={page} />;
}
