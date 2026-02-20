import React from 'react';
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { getEmbedStyleObject } from './embedFormatting';
import { EmbedDragHandle } from './EmbedDragHandle';
import { useFreefloatDrag } from './useFreefloatDrag';

export const VideoView: React.FC<NodeViewProps> = ({ node, selected, updateAttributes }) => {
  const { src, width, wrap, textBehaviour, x, y } = node.attrs as {
    src: string;
    width?: string;
    wrap?: string;
    textBehaviour?: string;
    x?: string;
    y?: string;
  };

  const isFreefloat = wrap === 'freefloat';
  const freefloatDrag = useFreefloatDrag({ x, y }, updateAttributes);

  const outerStyle: React.CSSProperties = {
    ...getEmbedStyleObject({ width, wrap, textBehaviour, x, y }),
    position: 'relative',
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
      <EmbedDragHandle onFreefloatMouseDown={isFreefloat ? freefloatDrag : undefined} />
      <video src={src} controls style={videoStyle} draggable={false} />
    </NodeViewWrapper>
  );
};
