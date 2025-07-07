"use client";
import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

// Initialize Mermaid with dark theme for view context
mermaid.initialize({
  theme: 'dark',
  themeVariables: {
    primaryColor: '#3b82f6',
    primaryTextColor: '#e5e7eb',
    primaryBorderColor: '#374151',
    lineColor: '#6b7280',
    sectionBkgColor: '#1f2937',
    altSectionBkgColor: '#111827',
    gridColor: '#374151',
    secondaryColor: '#6366f1',
    tertiaryColor: '#8b5cf6'
  },
  startOnLoad: false,
  fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
});

interface MermaidViewProps {
  code: string;
}

export default function MermaidView({ code }: MermaidViewProps) {
  const [svgContent, setSvgContent] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const renderMermaid = async () => {
      if (!code.trim()) {
        setSvgContent('');
        setError('');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const id = `mermaid-view-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, code);
        setSvgContent(svg);
        setError('');
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
        setSvgContent('');
      } finally {
        setIsLoading(false);
      }
    };

    renderMermaid();
  }, [code]);

  if (isLoading) {
    return (
      <div className="mermaid-diagram">
        <div className="text-center text-gray-400 py-4">
          Rendering diagram...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mermaid-error">
        <div className="error-title">Mermaid Diagram Error</div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (!svgContent) {
    return (
      <div className="mermaid-diagram">
        <div className="text-center text-gray-400 py-4">
          No diagram content
        </div>
      </div>
    );
  }

  return (
    <div className="mermaid-diagram">
      <div 
        className="mermaid-svg"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
}
