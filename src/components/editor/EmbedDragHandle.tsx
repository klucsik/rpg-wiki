import React from 'react';

interface EmbedDragHandleProps {
  label?: string;
  /**
   * When provided the handle operates in freefloat mode:
   * - `data-drag-handle` is omitted (ProseMirror won't intercept the drag)
   * - The provided handler updates x/y node attrs via custom mouse tracking
   */
  onFreefloatMouseDown?: (e: React.MouseEvent) => void;
}

export const EmbedDragHandle: React.FC<EmbedDragHandleProps> = ({ label, onFreefloatMouseDown }) => {
  const isFreefloat = !!onFreefloatMouseDown;

  return (
    <div
      {...(!isFreefloat ? { 'data-drag-handle': true } : {})}
      onMouseDown={onFreefloatMouseDown}
      contentEditable={false}
      title={isFreefloat ? 'Drag to reposition (text wraps around)' : 'Drag to reposition in document'}
      style={{
        position: 'absolute',
        top: '6px',
        left: '6px',
        cursor: isFreefloat ? 'move' : 'grab',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 6px',
        borderRadius: '4px',
        background: isFreefloat ? 'rgba(99,102,241,0.9)' : 'rgba(55,65,81,0.85)',
        color: '#fff',
        fontSize: '12px',
        userSelect: 'none',
        zIndex: 20,
        lineHeight: 1,
      }}
    >
      {/* Six-dot grid drag icon */}
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
        <circle cx="3" cy="2" r="1.2"/>
        <circle cx="3" cy="6" r="1.2"/>
        <circle cx="3" cy="10" r="1.2"/>
        <circle cx="9" cy="2" r="1.2"/>
        <circle cx="9" cy="6" r="1.2"/>
        <circle cx="9" cy="10" r="1.2"/>
      </svg>
      {label && <span>{label}</span>}
    </div>
  );
};
