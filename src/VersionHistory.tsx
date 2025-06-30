import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from './userContext';
import { authenticatedFetch } from './apiHelpers';

interface PageVersion {
  id: number;
  version: number;
  title: string;
  content: string;
  edited_by: string;
  edited_at: string;
  change_summary?: string;
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
  const { user } = useUser();
  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingVersion, setViewingVersion] = useState<PageVersion | null>(null);

  const loadVersions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authenticatedFetch(`/api/pages/${pageId}/versions`, user);
      
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
  }, [pageId, user]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const handleViewVersion = async (version: PageVersion) => {
    try {
      const response = await authenticatedFetch(`/api/pages/${pageId}/versions/${version.version}`, user);
      if (response.ok) {
        const fullVersion = await response.json();
        setViewingVersion(fullVersion);
        if (onViewVersion) {
          onViewVersion(fullVersion);
        }
      }
    } catch (err) {
      console.error('Failed to load version content:', err);
    }
  };

  const handleBackToHistory = () => {
    setViewingVersion(null);
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
        {onClose && (
          <button
            onClick={onClose}
            className="mt-4 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  if (viewingVersion) {
    return (
      <div className="bg-gray-900/90 border border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-indigo-200">
            Version {viewingVersion.version}: {viewingVersion.title}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handleBackToHistory}
              className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded text-sm transition"
            >
              ← Back to History
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition"
              >
                Close
              </button>
            )}
          </div>
        </div>
        
        <div className="text-sm text-gray-400 mb-4">
          Edited by <span className="text-indigo-300">{viewingVersion.edited_by}</span> on{' '}
          {new Date(viewingVersion.edited_at).toLocaleString()}
          {viewingVersion.change_summary && (
            <div className="mt-1 italic">&ldquo;{viewingVersion.change_summary}&rdquo;</div>
          )}
        </div>
        
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4 max-h-96 overflow-y-auto">
          <div 
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: viewingVersion.content }}
          />
        </div>
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
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition"
          >
            Close
          </button>
        )}
      </div>
      
      {versions.length === 0 ? (
        <div className="text-gray-400">No version history available</div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {versions.map((version, index) => (
            <div 
              key={version.id} 
              className="bg-gray-800/60 border border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-indigo-700 text-white px-2 py-1 rounded text-sm font-medium">
                      v{version.version}
                    </span>
                    {index === 0 && (
                      <span className="bg-green-700 text-white px-2 py-1 rounded text-xs">
                        Current
                      </span>
                    )}
                    <span className="text-indigo-200 font-medium">{version.title}</span>
                  </div>
                  
                  <div className="text-sm text-gray-400 mb-2">
                    Edited by <span className="text-indigo-300">{version.edited_by}</span> on{' '}
                    {new Date(version.edited_at).toLocaleString()}
                  </div>
                  
                  {version.change_summary && (
                    <div className="text-sm text-gray-300 italic">
                      &ldquo;{version.change_summary}&rdquo;
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleViewVersion(version)}
                    className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded text-sm transition"
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
