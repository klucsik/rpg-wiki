/**
 * Shared formatting utilities for embeddable nodes:
 * image, video, mermaid, drawio
 */
import type React from 'react';

export type EmbedAlign = 'left' | 'center' | 'right';
export type EmbedWrap = 'none' | 'left' | 'right' | 'freefloat';
export type EmbedTextBehaviour = 'linebreak' | 'inline' | 'wrap' | 'behind' | 'front';

export interface EmbedAttrs {
  width?: string;
  align?: EmbedAlign | string;
  wrap?: EmbedWrap | string;
  textBehaviour?: EmbedTextBehaviour | string;
  x?: string;
  y?: string;
}

/**
 * Returns a CSS style string suitable for use in TipTap's renderHTML.
 */
export function getEmbedCssStyle(attrs: EmbedAttrs): string {
  const { width = 'auto', wrap = 'none', textBehaviour = 'linebreak', x = '0', y = '0' } = attrs;
  let style = '';

  if (width && width !== 'auto') {
    style += `width:${width};`;
  }

  if (wrap === 'freefloat') {
    // Float-based free positioning: stays in document flow so text wraps.
    // x controls left margin (horizontal push), y controls top margin (vertical push).
    // Float direction is determined by x: left half → float left, right half → float right.
    const xNum = parseInt(x || '0', 10);
    const floatDir = xNum >= 0 ? 'left' : 'right';
    const absX = Math.abs(xNum);
    const yNum = Math.max(0, parseInt(y || '0', 10));
    if (floatDir === 'left') {
      style += `float:left;margin-left:${absX}px;margin-top:${yNum}px;margin-right:1rem;margin-bottom:0.5rem;`;
    } else {
      style += `float:right;margin-right:${absX}px;margin-top:${yNum}px;margin-left:1rem;margin-bottom:0.5rem;`;
    }
    if (textBehaviour === 'behind') style += 'position:relative;z-index:-1;';
    else if (textBehaviour === 'front') style += 'position:relative;z-index:10;';
    return style;
  }

  if (wrap === 'left') {
    style += 'float:left;margin-right:1rem;margin-bottom:0.5rem;';
  } else if (wrap === 'right') {
    style += 'float:right;margin-left:1rem;margin-bottom:0.5rem;';
  } else {
    if (textBehaviour === 'inline') {
      style += 'display:inline-block;vertical-align:middle;';
    } else {
      style += 'display:block;margin-left:auto;margin-right:auto;';
    }
  }

  if (textBehaviour === 'behind') style += 'position:relative;z-index:-1;';
  else if (textBehaviour === 'front') style += 'position:relative;z-index:10;';

  return style;
}

/**
 * Returns a React-compatible CSSProperties style object for NodeView inline styles.
 */
export function getEmbedStyleObject(attrs: EmbedAttrs): React.CSSProperties {
  const { width = 'auto', wrap = 'none', textBehaviour = 'linebreak', x = '0', y = '0' } = attrs;
  const style: React.CSSProperties = {};

  if (width && width !== 'auto') {
    style.width = width;
    style.maxWidth = width;
  }

  if (wrap === 'freefloat') {
    const xNum = parseInt(x || '0', 10);
    const floatDir = xNum >= 0 ? 'left' : 'right';
    const absX = Math.abs(xNum);
    const yNum = Math.max(0, parseInt(y || '0', 10));
    if (floatDir === 'left') {
      style.float = 'left';
      style.marginLeft = `${absX}px`;
      style.marginTop = `${yNum}px`;
      style.marginRight = '1rem';
      style.marginBottom = '0.5rem';
    } else {
      style.float = 'right';
      style.marginRight = `${absX}px`;
      style.marginTop = `${yNum}px`;
      style.marginLeft = '1rem';
      style.marginBottom = '0.5rem';
    }
    if (textBehaviour === 'behind') { style.position = 'relative'; style.zIndex = -1; }
    else if (textBehaviour === 'front') { style.position = 'relative'; style.zIndex = 10; }
    return style;
  }

  if (wrap === 'left') {
    style.float = 'left';
    style.marginRight = '1rem';
    style.marginBottom = '0.5rem';
  } else if (wrap === 'right') {
    style.float = 'right';
    style.marginLeft = '1rem';
    style.marginBottom = '0.5rem';
  } else if (textBehaviour === 'inline') {
    style.display = 'inline-block';
    style.verticalAlign = 'middle';
  } else {
    style.display = 'block';
    style.marginLeft = 'auto';
    style.marginRight = 'auto';
  }

  if (textBehaviour === 'behind') {
    style.position = 'relative';
    style.zIndex = -1;
  } else if (textBehaviour === 'front') {
    style.position = 'relative';
    style.zIndex = 10;
  }

  return style;
}

/** Shared TipTap attribute definitions for width / wrap / textBehaviour / x / y on embed nodes. */
export const sharedEmbedAttributes = {
  width: {
    default: 'auto',
    parseHTML: (element: HTMLElement) =>
      element.getAttribute('data-width') || element.style.width || 'auto',
    renderHTML: (attributes: Record<string, unknown>) => {
      const w = attributes.width as string;
      if (!w || w === 'auto') return {};
      return { 'data-width': w };
    },
  },
  align: {
    default: 'center' as EmbedAlign,
    parseHTML: (element: HTMLElement) =>
      (element.getAttribute('data-align') || 'center') as EmbedAlign,
    renderHTML: (attributes: Record<string, unknown>) => {
      const a = attributes.align as string;
      if (!a) return {};
      return { 'data-align': a };
    },
  },
  wrap: {
    default: 'none' as EmbedWrap,
    parseHTML: (element: HTMLElement) =>
      (element.getAttribute('data-wrap') || 'none') as EmbedWrap,
    renderHTML: (attributes: Record<string, unknown>) => {
      const w = attributes.wrap as string;
      if (!w || w === 'none') return {};
      return { 'data-wrap': w };
    },
  },
  textBehaviour: {
    default: 'linebreak' as EmbedTextBehaviour,
    parseHTML: (element: HTMLElement) =>
      (element.getAttribute('data-text-behaviour') || 'linebreak') as EmbedTextBehaviour,
    renderHTML: (attributes: Record<string, unknown>) => {
      const tb = attributes.textBehaviour as string;
      if (!tb || tb === 'linebreak') return {};
      return { 'data-text-behaviour': tb };
    },
  },
  x: {
    default: '0',
    parseHTML: (element: HTMLElement) => element.getAttribute('data-x') || '0',
    renderHTML: (attributes: Record<string, unknown>) => {
      const v = attributes.x as string;
      if (!v || v === '0') return {};
      return { 'data-x': v };
    },
  },
  y: {
    default: '0',
    parseHTML: (element: HTMLElement) => element.getAttribute('data-y') || '0',
    renderHTML: (attributes: Record<string, unknown>) => {
      const v = attributes.y as string;
      if (!v || v === '0') return {};
      return { 'data-y': v };
    },
  },
};
