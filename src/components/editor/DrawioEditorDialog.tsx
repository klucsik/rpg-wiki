import React, { useEffect, useRef, useState } from 'react';
import { DrawioClient } from './DrawioClient';

interface DrawioEditorDialogProps {
  initialXml: string;
  onSave: (xml: string, svg?: string) => void;
  onCancel: () => void;
}

export const DrawioEditorDialog: React.FC<DrawioEditorDialogProps> = ({
  initialXml,
  onSave,
  onCancel,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const clientRef = useRef<DrawioClient | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [currentXml, setCurrentXml] = useState(initialXml);
  const exportResolverRef = useRef<((xml: string) => void) | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const client = new DrawioClient(iframe);
    clientRef.current = client;

    // Wait for draw.io to initialize
    client.on('init', () => {
      console.log('Draw.io initialized');
      setIsReady(true);

      // Load initial XML if provided
      if (initialXml) {
        // Decode base64 if needed
        let xmlContent = initialXml;
        try {
          xmlContent = atob(initialXml);
        } catch (e) {
          // If decoding fails, assume it's already plain XML
          console.log('Using XML as-is');
        }
        client.loadXml(xmlContent);
      } else {
        // Load empty diagram
        client.loadXml('<mxfile><diagram id="1" name="Page-1"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>');
      }
    });

    // Handle export response
    client.on('export', (event) => {
      console.log('Export event received:', { 
        hasXml: !!event.xml, 
        hasData: !!('data' in event),
        format: event.format,
        xmlLength: event.xml?.length,
        dataLength: ('data' in event ? (event as any).data?.length : 'N/A')
      });
      
      if ('xml' in event && event.xml) {
        setCurrentXml(event.xml);
        // Resolve the export promise if waiting
        if (exportResolverRef.current) {
          exportResolverRef.current(event as any);
          exportResolverRef.current = null;
        }
      }
    });

    // Handle autosave
    client.on('autosave', (event) => {
      if ('xml' in event && event.xml) {
        setCurrentXml(event.xml);
      }
    });

    return () => {
      client.destroy();
    };
  }, [initialXml]);

  const handleSave = async () => {
    if (!clientRef.current) return;

    try {
      console.log('Requesting export with format: xmlsvg');
      
      // Request xmlsvg export (SVG with embedded XML for editing)
      const result = await new Promise<{ svg: string; xml: string }>((resolve, reject) => {
        const resolver = (event: any) => {
          console.log('Export resolver received event:', event.event, 'format:', event.format, 'has data:', !!event.data, 'has xml:', !!event.xml);
          // Accept if we have both SVG data and XML, regardless of format name
          if (event.event === 'export' && event.data && event.xml) {
            console.log('Resolving with SVG and XML');
            resolve({ svg: event.data, xml: event.xml });
          }
        };
        
        exportResolverRef.current = resolver;
        clientRef.current!.sendAction({ action: 'export', format: 'xmlsvg' });
        
        // Timeout after 5 seconds
        setTimeout(() => {
          if (exportResolverRef.current) {
            console.error('Export timeout - no response received');
            exportResolverRef.current = null;
            reject(new Error('Export timeout'));
          }
        }, 5000);
      });

      console.log('Exporting SVG with embedded XML, SVG length:', result.svg.length, 'XML length:', result.xml.length);
      
      // Encode XML as base64 for storage
      const base64Xml = btoa(result.xml);
      onSave(base64Xml, result.svg);
    } catch (error) {
      console.error('Failed to save diagram:', error);
      // Fallback to current state
      if (currentXml) {
        console.log('Falling back to current XML');
        const base64Xml = btoa(currentXml);
        onSave(base64Xml);
      } else {
        alert('Failed to export diagram. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    if (confirm('Discard changes?')) {
      onCancel();
    }
  };

  // Handle Escape key to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header with controls */}
      <div
        style={{
          backgroundColor: '#1f2937',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #374151',
        }}
      >
        <h2 style={{ margin: 0, color: '#f3f4f6', fontSize: '18px' }}>
          Edit Diagram
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleSave}
            disabled={!isReady}
            style={{
              padding: '8px 16px',
              backgroundColor: isReady ? '#10b981' : '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isReady ? 'pointer' : 'not-allowed',
              fontSize: '14px',
            }}
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Draw.io iframe */}
      <iframe
        ref={iframeRef}
        src="/drawio/index.html?embed=1&proto=json&spin=1&noSaveBtn=1&noExitBtn=1&dark=1"
        style={{
          flex: 1,
          border: 'none',
          width: '100%',
          backgroundColor: '#111827',
        }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
      />

      {!isReady && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#f3f4f6',
            fontSize: '18px',
          }}
        >
          Loading draw.io editor...
        </div>
      )}
    </div>
  );
};
