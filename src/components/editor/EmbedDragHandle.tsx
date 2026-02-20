import React from 'react';

/**
 * A drag handle placed inside a TipTap React NodeView.
 * The `data-drag-handle` attribute tells ProseMirror/TipTap
 * that this element (only) triggers the node drag — not the rest of the content.
 *
 * Usage: place inside a NodeViewWrapper whose parent node has `draggable: true`.
 */
export const EmbedDragHandle: React.FC<{ label?: string }> = ({ label }) => (
  <div
    data-drag-handle
    contentEditable={false}
    title={label ?? 'Drag to reposition'}
    style={{
      position: 'absolute',
      top: '6px',
      left: '6px',
      cursor: 'grab',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 6px',
      borderRadius: '4px',
      background: 'rgba(55,65,81,0.85)',
      color: '#c7d2fe',
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
