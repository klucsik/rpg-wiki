import React from 'react';
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { getEmbedStyleObject } from './embedFormatting';
import { EmbedDragHandle } from './EmbedDragHandle';

export const VideoView: React.FC<NodeViewProps> = ({ node, selected }) => {
  const { src, width, align, wrap } = node.attrs as {
    src: string;
    width?: string;
    align?: string;
    wrap?: string;
  };

  const outerStyle: React.CSSProperties = {
    ...getEmbedStyleObject({ width, align, wrap }),
    position: 'relative',
    display: 'block',
  };

  const videoStyle: React.CSSProperties = {
    maxWidth: '100%',
    height: 'auto',
    display: 'block',
    outline: selected ? '2px solid #3b82f6' : undefined,
    borderRadius: '2px',
  };

  if (width && width !== 'auto') {
    videoStyle.width = width;
  }

  return (
    <NodeViewWrapper style={outerStyle} as="span">
      <EmbedDragHandle />
      <video src={src} controls style={videoStyle} draggable={false} />
    </NodeViewWrapper>
  );
};
