import React from 'react';
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { getEmbedStyleObject } from './embedFormatting';
import { EmbedDragHandle } from './EmbedDragHandle';

export const ImageView: React.FC<NodeViewProps> = ({ node, selected }) => {
  const { src, alt, title, width, align, wrap } = node.attrs as {
    src: string;
    alt?: string;
    title?: string;
    width?: string;
    align?: string;
    wrap?: string;
  };

  const outerStyle: React.CSSProperties = {
    ...getEmbedStyleObject({ width, align, wrap }),
    position: 'relative',
    display: 'block',
  };

  const imgStyle: React.CSSProperties = {
    maxWidth: '100%',
    height: 'auto',
    display: 'block',
    outline: selected ? '2px solid #3b82f6' : undefined,
    borderRadius: '2px',
  };

  if (width && width !== 'auto') {
    imgStyle.width = width;
  }

  return (
    <NodeViewWrapper style={outerStyle} as="span">
      <EmbedDragHandle />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt || ''} title={title} style={imgStyle} draggable={false} />
    </NodeViewWrapper>
  );
};
