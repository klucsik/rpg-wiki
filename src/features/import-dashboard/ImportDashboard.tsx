"use client";

import React, { useState, useEffect, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────
interface ImportJob {
  id: number;
  status: string;
  sourceFileName: string | null;
  fileType: string | null;
  fileSizeBytes: number | null;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
  log: string | null; // JSON array of { ts, msg }
  pagesCreated: number;
  imagesImported: number;
  manifestPageId: number | null;
  triggeredBy: string;
}

interface ApiResponse {
  jobs: ImportJob[];
  total: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────
function statusColor(status: string): string {
  switch (status) {
    case 'completed': return '#22c55e'; // green-500
    case 'running':   return '#f97316'; // orange-500
    case 'pending':   return '#a855f7'; // purple-500
    case 'failed':    return '#ef4444'; // red-500
    case 'archived':  return '#6b7280'; // gray-500
    default:          return '#9ca3af'; // gray-400
  }
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pending',
    running: 'Running...',
    completed: 'Completed',
    failed: 'Failed',
    archived: 'Archived',
  };
  return labels[status] || status;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

// ─── Sub-components ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${statusColor(status)}22`, color: statusColor(status) }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${status === 'running' ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: statusColor(status) }}
      />
      {statusLabel(status)}
    </span>
  );
}

// Calculate progress percentage from log entries
function calcProgress(job: ImportJob): number {
  if (job.status === 'completed') return 100;
  if (job.status === 'failed' || job.status === 'archived') return -1;
  if (job.status === 'pending') return 0;
  // For running jobs, estimate from log entries
  let logs: Array<{ ts: string; msg: string }> = [];
  try { if (job.log) logs = JSON.parse(job.log); } catch {}
  if (logs.length === 0) return 10; // minimal progress
  const knownSteps = ['File uploaded', 'Starting import', 'Parsing', 'Importing images', 'Creating pages', 'Completed'];
  let completedSteps = 0;
  for (const step of knownSteps) {
    if (logs.some(e => e.msg.toLowerCase().includes(step.toLowerCase()))) {
      completedSteps++;
    }
  }
  return Math.min(95, Math.round((completedSteps / knownSteps.length) * 100));
}

function JobRow({ job, onDelete, onArchive, onRerun }: {
  job: ImportJob;
  onDelete: (id: number) => void;
  onArchive: (id: number) => void;
  onRerun: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  let logs: Array<{ ts: string; msg: string }> = [];
  try {
    if (job.log) logs = JSON.parse(job.log);
  } catch {}

  const progress = calcProgress(job);

  return (
    <div className="border border-gray-700/50 rounded-lg overflow-hidden bg-gray-800/30">
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-700/20 transition"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-xs text-gray-500 font-mono w-12 shrink-0">#{job.id}</span>

        <div className="flex-1 min-w-0">
          <p className="text-indigo-100 truncate text-sm font-medium">
            {job.sourceFileName || 'Unknown file'}
          </p>
          <p className="text-gray-500 text-xs">
            {formatDate(job.startedAt)} · {formatSize(job.fileSizeBytes)} · {job.fileType}
          </p>
          {/* Progress bar for running/pending jobs */}
          {job.status === 'running' && (
            <div className="mt-1.5 w-full bg-gray-700 rounded-full h-1 overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        <StatusBadge status={job.status} />

        <div className="flex items-center gap-3 shrink-0">
          {job.pagesCreated > 0 && (
            <span className="text-xs text-gray-400">
              📄{job.pagesCreated} · 🖼️{job.imagesImported}
            </span>
          )}
          {expanded ? (
            <span className="text-gray-500">▴</span>
          ) : (
            <span className="text-gray-500">▾</span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-700/50 p-4 bg-gray-900/30 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-gray-500 block text-xs">Pages</span>
              <span className="text-indigo-100 font-semibold">{job.pagesCreated}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs">Images</span>
              <span className="text-indigo-100 font-semibold">{job.imagesImported}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs">Started</span>
              <span className="text-indigo-100 font-mono text-xs">{formatDate(job.startedAt)}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs">Completed</span>
              <span className="text-indigo-100 font-mono text-xs">
                {job.completedAt ? formatDate(job.completedAt) : '—'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {job.manifestPageId && (
              <a
                href={`/pages/imports/manifest-${job.id}`}
                className="text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white transition"
                onClick={(e) => e.stopPropagation()}
              >
                📋 View Manifest
              </a>
            )}
            {(job.status === 'failed' || job.status === 'pending') && (
              <button
                className="text-xs px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-600 text-blue-100 transition"
                onClick={(e) => { e.stopPropagation(); onRerun(job.id); }}
              >
                🔄 Re-run
              </button>
            )}
            {job.status !== 'archived' && job.status !== 'running' && (
              <button
                className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 transition"
                onClick={(e) => { e.stopPropagation(); onArchive(job.id); }}
              >
                Archive
              </button>
            )}
            <button
              className="text-xs px-3 py-1.5 rounded bg-red-900/50 hover:bg-red-800/70 text-red-300 transition"
              onClick={(e) => { e.stopPropagation(); onDelete(job.id); }}
            >
              Delete Job
            </button>
          </div>

          {/* Logs */}
          {logs.length > 0 && (
            <div className="bg-gray-950 rounded-md p-3 font-mono text-xs overflow-auto max-h-48">
              {logs.map((entry, i) => (
                <div key={i} className="text-gray-400 border-b border-gray-800/50 last:border-0 py-1">
                  <span className="text-gray-600 mr-2">{new Date(entry.ts).toLocaleTimeString()}</span>
                  {entry.msg.startsWith('ERROR') ? (
                    <span className="text-red-400">{entry.msg}</span>
                  ) : (
                    entry.msg
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {job.error && (
            <div className="bg-red-950/30 border border-red-800/50 rounded-md p-3 text-sm text-red-400">
              <strong>Error:</strong> {job.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function ImportDashboard() {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/import/google-docs');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ApiResponse = await res.json();
      setJobs(data.jobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    // Auto-refresh every 5 seconds (for running jobs)
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/import/google-docs', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      // Refresh job list immediately
      fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) await handleFileUpload(file);
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleFileUpload(file);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this import job? This will NOT delete the created wiki pages.')) return;
    try {
      await fetch(`/api/admin/import/google-docs/${id}`, { method: 'DELETE' });
      fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleArchive = async (id: number) => {
    try {
      await fetch(`/api/admin/import/google-docs/${id}?action=archive`, { method: 'PATCH' });
      fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed');
    }
  };

  const handleRerun = async (id: number) => {
    if (!confirm('Re-run this import? A new job will be created using the original file.')) return;
    try {
      const res = await fetch(`/api/admin/import/google-docs/${id}?action=re-run`, { method: 'PATCH' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Re-run failed');
    }
  };

  // Count by status for header indicator
  const runningCount = jobs.filter(j => j.status === 'running').length;
  const completedCount = jobs.filter(j => j.status === 'completed').length;

  return (
    <div className="ImportDashboard-root space-y-6">
      {/* Header Status */}
      <div className="flex items-center gap-4 text-sm">
        {runningCount > 0 && (
          <span 
            className="px-3 py-1 rounded-full flex items-center gap-2"
            style={{ backgroundColor: '#f9731622', color: '#f97316' }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse bg-orange-500" />
            {runningCount} in progress
          </span>
        )}
        {completedCount > 0 && (
          <span 
            className="px-3 py-1 rounded-full flex items-center gap-2"
            style={{ backgroundColor: '#22c55e22', color: '#22c55e' }}
          >
            ✅ {completedCount} completed
          </span>
        )}
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer
          ${dragOver ? 'border-indigo-400 bg-indigo-950/30' : 'border-gray-700 hover:border-gray-600 bg-gray-800/20'}
        `}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && document.getElementById('import-file-input')?.click()}
      >
        <input 
          id="import-file-input" 
          type="file" 
          accept=".md,.html,.zip" 
          className="hidden" 
          onChange={handleInputChange}
          disabled={uploading}
        />
        
        {uploading ? (
          <>
            <div className="w-8 h-8 mx-auto mb-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-indigo-300 font-medium">Importing...</p>
            <p className="text-gray-500 text-sm mt-1">This may take a moment</p>
          </>
        ) : (
          <>
            <div className="text-3xl mb-2">📁</div>
            <p className="text-indigo-300 font-medium">Drop your exported file here</p>
            <p className="text-gray-500 text-sm mt-1">Markdown (.md), HTML (.html), or ZIP archive</p>
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Job List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-indigo-200 mb-2">Import History</h2>
        
        {loading && jobs.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">Loading...</p>
        ) : jobs.length === 0 ? (
          <div className="bg-gray-800/20 rounded-lg p-8 text-center border border-gray-700/50">
            <p className="text-gray-400 mb-1">No imports yet</p>
            <p className="text-gray-600 text-sm">Upload a file above to get started</p>
          </div>
        ) : (
          jobs.map(job => (
            <JobRow key={job.id} job={job} onDelete={handleDelete} onArchive={handleArchive} onRerun={handleRerun} />
          ))
        )}
      </div>
    </div>
  );
}
