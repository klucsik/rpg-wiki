"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch } from '../../lib/api/apiHelpers';

interface PageVersion {
  id: number;
  version: number;
  title: string;
  content?: string;
  edited_by: string;
  edited_at: string;
  change_summary?: string;
  content_hash?: string;
  is_draft?: boolean;
}

interface VersionHistoryProps {
  pageId: number;
  onViewVersion?: (versionData: PageVersion) => void;
  onClose?: () => void;
}

export default function VersionHistory({ 
  pageId, 
  onViewVersion,
  onClose 
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingVersion, setViewingVersion] = useState<PageVersion | null>(null);

  const loadVersions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url = `/api/pages/${pageId}/versions?drafts=true`;
      const response = await authenticatedFetch(url);
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Only editors can view page history');
        }
        throw new Error('Failed to load version history');
      }

      const data = await response.json();
      setVersions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const handleViewVersion = async (version: PageVersion) => {
    try {
      const response = await authenticatedFetch(`/api/pages/${pageId}/versions/${version.version}`);
      if (!response.ok) {
        throw new Error('Failed to load version content');
      }
      
      const versionData = await response.json();
      setViewingVersion(versionData);
      
      if (onViewVersion) {
        onViewVersion(versionData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load version');
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900/90 border border-gray-800 rounded-lg p-6">
        <div className="text-indigo-400">Loading version history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900/90 border border-gray-800 rounded-lg p-6">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/90 border border-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-indigo-200">Version History</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ×
          </button>
        )}
      </div>
      
      {versions.length === 0 ? (
        <div className="text-gray-400">No versions found.</div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {versions.map((version) => (
            <div
              key={version.id}
              className="border border-gray-700 rounded-lg p-4 hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-indigo-200">
                      Version {version.version}
                    </span>
                    {version.is_draft && (
                      <span className="px-2 py-0.5 bg-yellow-600/30 border border-yellow-500 rounded text-yellow-200 text-xs">
                        DRAFT
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-300 mb-2">
                    <div>By: {version.edited_by}</div>
                    <div>Date: {new Date(version.edited_at).toLocaleString()}</div>
                    {version.content_hash && (
                      <div 
                        className="mt-1 font-mono text-xs text-gray-400 cursor-help"
                        title={`Full hash: ${version.content_hash}`}
                      >
                        Hash: {version.content_hash.substring(0, 12)}...
                      </div>
                    )}
                    {version.change_summary && (
                      <div className="mt-1 text-indigo-300">
                        Summary: {version.change_summary}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleViewVersion(version)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {viewingVersion && (
        <div className="mt-6 border-t border-gray-700 pt-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-lg font-semibold text-indigo-200">
              Version {viewingVersion.version} - {viewingVersion.title}
              {viewingVersion.is_draft && (
                <span className="ml-2 px-2 py-0.5 bg-yellow-600/30 border border-yellow-500 rounded text-yellow-200 text-xs">
                  DRAFT
                </span>
              )}
            </h4>
            {viewingVersion.content_hash && (
              <div 
                className="text-xs font-mono text-gray-400 mt-1 cursor-help"
                title={`Full hash: ${viewingVersion.content_hash}`}
              >
                Content Hash: {viewingVersion.content_hash.substring(0, 16)}...
              </div>
            )}
            <button
              onClick={() => setViewingVersion(null)}
              className="text-gray-400 hover:text-white"
            >
              Close
            </button>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 max-h-60 overflow-y-auto">
            <div 
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: viewingVersion.content || 'No content' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
