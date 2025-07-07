import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaid: {
      insertMermaid: (options?: { code?: string }) => ReturnType;
    };
  }
}

// Initialize Mermaid with dark theme
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

const MermaidNodeView: React.FC<NodeViewProps> = ({ 
  node, 
  updateAttributes, 
  selected,
  editor 
}) => {
  const [code, setCode] = useState(node.attrs.code || '');
  const [isEditing, setIsEditing] = useState(false);
  const [svgContent, setSvgContent] = useState('');
  const [error, setError] = useState('');
  const mermaidRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (code && !isEditing) {
      renderMermaid();
    }
  }, [code, isEditing]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const renderMermaid = async () => {
    if (!code.trim()) {
      setSvgContent('');
      setError('');
      return;
    }

    try {
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      const { svg } = await mermaid.render(id, code);
      setSvgContent(svg);
      setError('');
    } catch (err) {
      console.error('Mermaid rendering error:', err);
      setError(err instanceof Error ? err.message : 'Failed to render diagram');
      setSvgContent('');
    }
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };

  const handleSave = () => {
    updateAttributes({ code });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setCode(node.attrs.code || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
  };

  if (isEditing) {
    return (
      <NodeViewWrapper>
        <div className="mermaid-editor border-2 border-blue-500 rounded-lg p-4 bg-gray-800 my-4">
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-200 mb-1">
              Mermaid Diagram Code
            </label>
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-40 p-3 bg-gray-900 text-gray-100 border border-gray-600 rounded font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter Mermaid diagram code here..."
              spellCheck={false}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Save (Ctrl+Enter)
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel (Esc)
            </button>
          </div>
          {error && (
            <div className="mt-2 p-2 bg-red-900 border border-red-700 rounded text-red-200 text-sm">
              {error}
            </div>
          )}
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <div 
        className={`mermaid-diagram ${selected ? 'ring-2 ring-blue-500' : ''} rounded-lg p-4 bg-gray-900 my-4 cursor-pointer transition-all`}
        onClick={() => setIsEditing(true)}
        ref={mermaidRef}
      >
        {svgContent ? (
          <div 
            dangerouslySetInnerHTML={{ __html: svgContent }}
            className="mermaid-svg [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:mx-auto"
          />
        ) : error ? (
          <div className="p-4 bg-red-900 border border-red-700 rounded text-red-200">
            <p className="font-medium">Mermaid Error:</p>
            <p className="text-sm mt-1">{error}</p>
            <p className="text-xs mt-2 text-gray-400">Click to edit the diagram code</p>
          </div>
        ) : code ? (
          <div className="p-4 bg-gray-800 border border-gray-600 rounded text-gray-300">
            <p className="text-sm">Rendering diagram...</p>
          </div>
        ) : (
          <div className="p-4 bg-gray-800 border-2 border-dashed border-gray-600 rounded text-gray-400 text-center">
            <p className="text-sm">Click to add a Mermaid diagram</p>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export const MermaidNode = Node.create({
  name: 'mermaid',
  
  group: 'block',
  
  atom: true,
  
  addAttributes() {
    return {
      code: {
        default: '',
        parseHTML: element => element.getAttribute('data-code') || '',
        renderHTML: attributes => ({
          'data-code': attributes.code,
        }),
      },
    };
  },
  
  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid"]',
      },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'mermaid' })];
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(MermaidNodeView);
  },
  
  addCommands() {
    return {
      insertMermaid: (options?: { code?: string }) => ({ commands }: any) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },
});
