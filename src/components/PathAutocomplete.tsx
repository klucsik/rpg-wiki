import React, { useState, useEffect, useRef } from 'react';
import { authenticatedFetch } from '../apiHelpers';

interface PathSuggestion {
  id: number;
  title: string;
  path: string;
}

interface PathAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export default function PathAutocomplete({ 
  value, 
  onChange, 
  disabled = false, 
  className = "", 
  placeholder = "/lore/dragons" 
}: PathAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<PathSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Fetch suggestions based on the current input
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (value.length < 1) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        // Search for pages that match the path input
        const response = await authenticatedFetch(`/api/search/pages?q=${encodeURIComponent(value)}&limit=10`);
        if (response.ok) {
          const data = await response.json();
          const uniquePaths = new Set<string>();
          const pathSuggestions: PathSuggestion[] = [];

          // Extract unique path segments that match or start with the input
          data.results.forEach((page: PathSuggestion) => {
            // Add the exact page path
            if (page.path.toLowerCase().includes(value.toLowerCase())) {
              pathSuggestions.push(page);
            }

            // Extract parent paths that might be useful
            const pathParts = page.path.split('/').filter(Boolean);
            for (let i = 1; i <= pathParts.length; i++) {
              const partialPath = '/' + pathParts.slice(0, i).join('/');
              if (partialPath.toLowerCase().includes(value.toLowerCase()) && !uniquePaths.has(partialPath)) {
                uniquePaths.add(partialPath);
                // Only add if we don't already have this exact path from a page
                if (!pathSuggestions.some(p => p.path === partialPath)) {
                  pathSuggestions.push({
                    id: -1, // Indicate this is a path suggestion, not a page
                    title: `Path: ${partialPath}`,
                    path: partialPath
                  });
                }
              }
            }
          });

          // Sort suggestions: exact matches first, then by path depth, then alphabetically
          pathSuggestions.sort((a, b) => {
            const aExact = a.path.toLowerCase() === value.toLowerCase() ? 1 : 0;
            const bExact = b.path.toLowerCase() === value.toLowerCase() ? 1 : 0;
            
            if (aExact !== bExact) return bExact - aExact;
            
            const aStarts = a.path.toLowerCase().startsWith(value.toLowerCase()) ? 1 : 0;
            const bStarts = b.path.toLowerCase().startsWith(value.toLowerCase()) ? 1 : 0;
            
            if (aStarts !== bStarts) return bStarts - aStarts;
            
            const aDepth = a.path.split('/').length;
            const bDepth = b.path.split('/').length;
            
            if (aDepth !== bDepth) return aDepth - bDepth;
            
            return a.path.localeCompare(b.path);
          });

          setSuggestions(pathSuggestions.slice(0, 8)); // Limit to 8 suggestions
        }
      } catch (error) {
        console.error('Error fetching path suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [value]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && suggestions.length === 0) {
        setShowSuggestions(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = prev < suggestions.length - 1 ? prev + 1 : 0;
          suggestionRefs.current[next]?.scrollIntoView({ block: 'nearest' });
          return next;
        });
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = prev > 0 ? prev - 1 : suggestions.length - 1;
          suggestionRefs.current[next]?.scrollIntoView({ block: 'nearest' });
          return next;
        });
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          selectSuggestion(suggestions[selectedIndex]);
        }
        break;
      
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const selectSuggestion = (suggestion: PathSuggestion) => {
    onChange(suggestion.path);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    setShowSuggestions(true);
    setSelectedIndex(-1);
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 150);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.path}-${suggestion.id}`}
              ref={el => { suggestionRefs.current[index] = el; }}
              className={`px-3 py-2 cursor-pointer transition-colors ${
                index === selectedIndex 
                  ? 'bg-indigo-700 text-indigo-100' 
                  : 'text-indigo-200 hover:bg-gray-700'
              }`}
              onClick={() => selectSuggestion(suggestion)}
            >
              <div className="flex flex-col">
                <div className="font-mono text-sm">
                  {suggestion.path}
                </div>
                {suggestion.id !== -1 && (
                  <div className="text-xs text-gray-400 mt-1">
                    {suggestion.title}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="px-3 py-2 text-gray-400 text-sm">
              Searching...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
