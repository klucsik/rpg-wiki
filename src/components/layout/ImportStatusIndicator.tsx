"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useUser } from "@/features/auth/userContext";

interface ImportSummary {
  running: number;
  pending: number;
  completedRecent: number; // completed in last hour
}

export default function ImportStatusIndicator() {
  const { user } = useUser();
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;

    const pollJobs = async () => {
      try {
        const response: Response = await globalThis.fetch("/api/import/google-docs?limit=50");
        if (!response.ok) return;
        const data: any = await response.json();
        const jobs = data.jobs || [];
        const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();

        setSummary({
          running: jobs.filter((j: any) => j.status === "running").length,
          pending: jobs.filter((j: any) => j.status === "pending").length,
          completedRecent: jobs.filter(
            (j: any) => j.status === "completed" && j.completedAt >= oneHourAgo
          ).length,
        });

        // Show if there's activity
        setVisible(true);
      } catch {
        /* ignore */
      }
    };

    pollJobs();
    const interval = setInterval(pollJobs, 10_000);
    return () => clearInterval(interval);
  }, [user]);

  if (!visible || !summary) return null;

  const hasRunning = summary.running > 0 || summary.pending > 0;
  const hasCompleted = summary.completedRecent > 0 && !hasRunning;

  // Determine color: orange for active, green for recently completed
  const dotColor = hasRunning ? "#f97316" : hasCompleted ? "#22c55e" : null;
  const bgColor = hasRunning ? "#f9731622" : hasCompleted ? "#22c55e22" : "transparent";

  if (!dotColor) return null;

  return (
    <Link
      href="/import"
      className="ImportStatusIndicator-root inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition hover:opacity-80"
      style={{ backgroundColor: bgColor, color: dotColor }}
      title={
        summary.running > 0 ? `${summary.running} import(s) running` :
        summary.completedRecent > 0 ? `${summary.completedRecent} completed recently` :
        "Imports"
      }
    >
      <span
        className="ImportStatusIndicator-dot w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{
          backgroundColor: dotColor,
          animation: hasRunning ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" : "none",
        }}
      />
      <span className="hidden sm:inline">Imports</span>
    </Link>
  );
}
