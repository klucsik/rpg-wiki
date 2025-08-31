'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LinkSearchResult } from '../../lib/search/types';
import { getPageDisplayText } from '../../lib/page-display-utils';

interface LinkSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPageSelect: (page: LinkSearchResult) => void;
  initialQuery?: string;
}

export default function LinkSearchModal({ 
  isOpen, 
  onClose, 
  onPageSelect, 
  initialQuery = '' 
}: LinkSearchModalProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<LinkSearchResult[]>([]);
  const [recentPages, setRecentPages] = useState<LinkSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Load recent pages when modal opens
  useEffect(() => {
    if (isOpen) {
      loadRecentPages();
      setQuery(initialQuery);
      setSelectedIndex(0);
    }
  }, [isOpen, initialQuery]);

    // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.trim().length < 2) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/search/pages?q=${encodeURIComponent(searchQuery)}&type=all&limit=20`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setResults(data.results || []);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  // Load recent pages
  const loadRecentPages = async () => {
    try {
      const response = await fetch('/api/search/pages/recent?limit=10');
      if (response.ok) {
        const data = await response.json();
        setRecentPages(data.results || []);
      }
    } catch (err) {
      console.error('Failed to load recent pages:', err);
    }
  };

  // Effect to trigger search when query changes
  useEffect(() => {
    if (query.trim()) {
      debouncedSearch(query);
    } else {
      setResults([]);
      setError(null);
    }
  }, [query, debouncedSearch]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentResults = query.trim() ? results : recentPages;
    
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < currentResults.length - 1 ? prev + 1 : 0
      );
    }
    
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev > 0 ? prev - 1 : currentResults.length - 1
      );
    }
    
    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentResults[selectedIndex]) {
        handlePageSelect(currentResults[selectedIndex]);
      }
    }
  };

  // Handle page selection
  const handlePageSelect = (page: LinkSearchResult) => {
    onPageSelect(page);
    onClose();
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelectedIndex(0);
  };

  // Handle result click
  const handleResultClick = (page: LinkSearchResult, index: number) => {
    setSelectedIndex(index);
    handlePageSelect(page);
  };

  if (!isOpen) return null;

  const currentResults = query.trim() ? results : recentPages;
  const showingRecent = !query.trim() && recentPages.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-100">
              {showingRecent ? 'Select a page to link' : 'Search for pages'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="px-6 py-4">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Search page titles and paths..."
              autoFocus
              className="w-full px-4 py-2 pl-10 text-gray-100 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {isLoading && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {error ? (
            <div className="px-6 py-4 text-red-400">
              <div className="text-sm">Search Error</div>
              <div className="text-xs text-gray-400 mt-1">{error}</div>
            </div>
          ) : currentResults.length > 0 ? (
            <div className="py-2">
              {showingRecent && (
                <div className="px-6 py-2 text-sm text-gray-400 border-b border-gray-700">
                  Recent Pages
                </div>
              )}
              {currentResults.map((page, index) => (
                <div
                  key={page.id}
                  onClick={() => handleResultClick(page, index)}
                  className={`px-6 py-3 cursor-pointer transition-colors ${
                    index === selectedIndex 
                      ? 'bg-indigo-600 text-white' 
                      : 'hover:bg-gray-700 text-gray-100'
                  }`}
                >
                  <div className="font-medium truncate">{getPageDisplayText(page)}</div>
                  <div className={`text-xs truncate mt-1 ${
                    index === selectedIndex ? 'text-indigo-100' : 'text-gray-400'
                  }`}>
                    Last updated: {/* We don't have update time in LinkSearchResult, so just show path context */}
                    {page.path === '/' ? 'Root page' : `Path: ${page.path}`}
                  </div>
                </div>
              ))}
            </div>
          ) : query.trim().length >= 2 && !isLoading ? (
            <div className="px-6 py-8 text-center text-gray-400">
              <div className="text-sm">No pages found for &quot;{query}&quot;</div>
              <div className="text-xs mt-2">Try a different search term</div>
            </div>
          ) : !showingRecent && !query.trim() ? (
            <div className="px-6 py-8 text-center text-gray-400">
              <div className="text-sm">Start typing to search for pages</div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-700 bg-gray-750">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center space-x-4">
              <span>↑↓ Navigate</span>
              <span>Enter Select</span>
              <span>Esc Close</span>
            </div>
            {currentResults.length > 0 && (
              <span>{currentResults.length} result{currentResults.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
