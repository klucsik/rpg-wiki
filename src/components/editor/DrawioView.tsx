import React, { useEffect, useState, useCallback } from 'react';
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { DrawioEditorDialog } from './DrawioEditorDialog';
import { getEmbedStyleObject } from './embedFormatting';
import { EmbedDragHandle } from './EmbedDragHandle';
import { useFreefloatDrag } from './useFreefloatDrag';

export const DrawioView: React.FC<NodeViewProps> = ({ node, updateAttributes, selected, deleteNode }) => {
  const [showEditor, setShowEditor] = useState(false);
  const [svgContent, setSvgContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const diagramXml = node.attrs.diagramXml as string;
  const diagramSvg = node.attrs.diagramSvg as string;
  const wrap = node.attrs.wrap as string | undefined;
  const isFreefloat = wrap === 'freefloat';
  const freefloatDrag = useFreefloatDrag(
    { x: node.attrs.x, y: node.attrs.y },
    updateAttributes,
  );

  // Render SVG preview - use stored SVG if available, otherwise render via API
  const renderSvg = useCallback(async () => {
    // If we have stored SVG, use it directly
    if (diagramSvg && diagramSvg.trim() !== '') {
      console.log('Using stored SVG, length:', diagramSvg.length);
      setSvgContent(diagramSvg);
      return;
    }

    // Otherwise try to render via API (fallback for old diagrams)
    if (!diagramXml || diagramXml.trim() === '') {
      setSvgContent('');
      setError('');
      return;
    }

    console.log('Rendering diagram via API, XML length:', diagramXml.length);
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/drawio/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagramXml }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to render diagram');
      }

      const data = await response.json();
      console.log('Received SVG from API, length:', data.svg?.length);
      setSvgContent(data.svg);
      // Store the SVG for future use
      updateAttributes({ diagramSvg: data.svg });
    } catch (err) {
      console.error('Error rendering diagram:', err);
      setError(err instanceof Error ? err.message : 'Failed to render diagram');
      setSvgContent('');
    } finally {
      setIsLoading(false);
    }
  }, [diagramXml, diagramSvg, updateAttributes]);

  useEffect(() => {
    // Only render if editor is not open
    if (!showEditor) {
      renderSvg();
    }
  }, [renderSvg, showEditor]);

  const handleEdit = () => {
    setShowEditor(true);
  };

  const handleSave = (newXml: string, newSvg?: string) => {
    console.log('Saving diagram, new XML length:', newXml.length, 'SVG length:', newSvg?.length);
    updateAttributes({ 
      diagramXml: newXml,
      diagramSvg: newSvg || ''
    });
    setShowEditor(false);
    
    // If SVG was provided, use it directly
    if (newSvg) {
      setSvgContent(newSvg);
    } else {
      // Trigger re-render of SVG after a short delay to ensure state is updated
      setTimeout(() => {
        renderSvg();
      }, 100);
    }
  };

  const handleCancel = () => {
    // If diagram is empty and user cancels, delete the node
    if (!diagramXml || diagramXml.trim() === '') {
      if (confirm('Delete this empty diagram?')) {
        deleteNode();
      } else {
        setShowEditor(false);
      }
    } else {
      setShowEditor(false);
    }
  };

  const handleDelete = () => {
    if (confirm('Delete this diagram?')) {
      deleteNode();
    }
  };

  // Open editor automatically if diagram is empty (but only on initial mount)
  const [hasOpened, setHasOpened] = useState(false);
  
  useEffect(() => {
    if (!diagramXml && !showEditor && !hasOpened) {
      setShowEditor(true);
      setHasOpened(true);
    }
  }, [diagramXml, showEditor, hasOpened]);

  return (
    <>
      <NodeViewWrapper
        className={`drawio-diagram-wrapper ${selected ? 'ProseMirror-selectednode' : ''}`}
        style={{
          ...getEmbedStyleObject({
            width: node.attrs.width,
            wrap: node.attrs.wrap,
            textBehaviour: node.attrs.textBehaviour,
            x: node.attrs.x,
            y: node.attrs.y,
          }),
          border: selected ? '2px solid #3b82f6' : '1px solid #374151',
          borderRadius: '4px',
          padding: '16px',
          margin: '16px 0',
          backgroundColor: '#1f2937',
          position: 'relative',
        }}
      >
        <EmbedDragHandle onFreefloatMouseDown={isFreefloat ? freefloatDrag : undefined} />
        <div className="diagram-controls" style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          display: 'flex',
          gap: '8px',
          zIndex: 10,
        }}>
          <button
            onClick={handleEdit}
            style={{
              padding: '4px 12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
            title="Edit diagram"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            style={{
              padding: '4px 12px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
            title="Delete diagram"
          >
            Delete
          </button>
        </div>

        {isLoading && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
            Loading diagram...
          </div>
        )}

        {error && (
          <div style={{ padding: '20px', color: '#ef4444', textAlign: 'center' }}>
            Error: {error}
          </div>
        )}

        {!isLoading && !error && svgContent && (
          <div
            className="diagram-preview"
            style={{
              marginTop: '40px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {svgContent.startsWith('data:image/svg+xml;base64,') ? (
              <img 
                src={svgContent} 
                alt="Diagram" 
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            ) : svgContent.startsWith('<svg') ? (
              <div dangerouslySetInnerHTML={{ __html: svgContent }} />
            ) : (
              <div dangerouslySetInnerHTML={{ __html: atob(svgContent.replace('data:image/svg+xml;base64,', '')) }} />
            )}
          </div>
        )}

        {!isLoading && !error && !svgContent && !diagramXml && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
            Click Edit to create your diagram
          </div>
        )}
      </NodeViewWrapper>

      {showEditor && (
        <DrawioEditorDialog
          initialXml={diagramXml}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </>
  );
};
