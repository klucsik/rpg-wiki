'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SearchResult } from '../../lib/search/types';
import { getPageDisplayText } from '../../lib/page-display-utils';

interface SearchBarProps {
  onResultsChange?: (results: SearchResult[]) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export default function SearchBar({ 
  onResultsChange, 
  placeholder = "Search wiki...", 
  autoFocus = false,
  className = ""
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.trim().length < 2) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `/api/search?q=${encodeURIComponent(searchQuery)}&type=all&limit=10`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Search failed');
        }

        const data = await response.json();
        setResults(data.results || []);
        onResultsChange?.(data.results || []);
      } catch (err) {
        console.error('Search error:', err);
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [onResultsChange]
  );

  // Effect to trigger search when query changes
  useEffect(() => {
    if (query.trim()) {
      debouncedSearch(query);
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
      setError(null);
    }
  }, [query, debouncedSearch]);

  // Handle result selection
  const handleResultClick = (result: SearchResult) => {
    router.push(`/pages/${result.pageId}`);
    setIsOpen(false);
    setQuery('');
  };

  // Handle input events
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleInputFocus = () => {
    if (results.length > 0) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = () => {
    // Delay closing to allow clicking on results
    setTimeout(() => setIsOpen(false), 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full px-4 py-2 pl-10 pr-4 text-gray-100 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        
        {/* Search Icon */}
        <div className="absolute inset-y-0 left-0 flex items-center pl-3">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (query.trim().length >= 2) && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {error ? (
            <div className="px-4 py-3 text-red-400">
              <div className="text-sm">Search Error</div>
              <div className="text-xs text-gray-400 mt-1">{error}</div>
            </div>
          ) : results.length > 0 ? (
            <>
              {results.map((result) => (
                <div
                  key={result.pageId}
                  onClick={() => handleResultClick(result)}
                  className="px-4 py-3 cursor-pointer hover:bg-gray-700 border-b border-gray-700 last:border-b-0"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-100 truncate">
                        {getPageDisplayText(result)}
                      </div>
                      {result.snippet && (
                        <div className="text-xs text-gray-300 mt-2 line-clamp-2">
                          <span dangerouslySetInnerHTML={{ __html: result.snippet }} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end ml-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        result.matchType === 'title' ? 'bg-blue-600 text-blue-100' :
                        result.matchType === 'path' ? 'bg-green-600 text-green-100' :
                        'bg-gray-600 text-gray-100'
                      }`}>
                        {result.matchType}
                      </span>
                      {result.hasRestrictedMatches && (
                        <span className="text-xs text-yellow-400 mt-1">🔒</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : query.trim().length >= 2 && !isLoading ? (
            <div className="px-4 py-3 text-gray-400 text-sm">
              No results found for "{query}"
            </div>
          ) : null}
        </div>
      )}
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
