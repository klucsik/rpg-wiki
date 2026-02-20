import React from 'react';
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { getEmbedStyleObject } from './embedFormatting';
import { EmbedDragHandle } from './EmbedDragHandle';
import { useFreefloatDrag } from './useFreefloatDrag';

export const ImageView: React.FC<NodeViewProps> = ({ node, selected, updateAttributes }) => {
  const { src, alt, title, width, wrap, textBehaviour, x, y } = node.attrs as {
    src: string;
    alt?: string;
    title?: string;
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
      <EmbedDragHandle onFreefloatMouseDown={isFreefloat ? freefloatDrag : undefined} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt || ''} title={title} style={imgStyle} draggable={false} />
    </NodeViewWrapper>
  );
};
