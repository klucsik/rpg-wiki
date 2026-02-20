/**
 * Shared formatting utilities for embeddable nodes:
 * image, video, mermaid, drawio
 */

export type EmbedAlign = 'left' | 'center' | 'right';
export type EmbedWrap = 'none' | 'left' | 'right';

export interface EmbedAttrs {
  width?: string;
  align?: EmbedAlign | string;
  wrap?: EmbedWrap | string;
}

/**
 * Returns a CSS style string suitable for use in TipTap's renderHTML.
 */
export function getEmbedCssStyle(attrs: EmbedAttrs): string {
  const { width = 'auto', align = 'center', wrap = 'none' } = attrs;
  let style = '';

  if (width && width !== 'auto') {
    style += `width:${width};`;
  }

  if (wrap === 'left') {
    style += 'float:left;margin-right:1rem;margin-bottom:0.5rem;';
  } else if (wrap === 'right') {
    style += 'float:right;margin-left:1rem;margin-bottom:0.5rem;';
  } else {
    // 'none' — block display, alignment via margins
    style += 'display:block;';
    if (align === 'left') {
      style += 'margin-left:0;margin-right:auto;';
    } else if (align === 'right') {
      style += 'margin-left:auto;margin-right:0;';
    } else {
      // center (default)
      style += 'margin-left:auto;margin-right:auto;';
    }
  }

  return style;
}

/**
 * Returns a plain CSS-properties-compatible object for use in React inline styles
 * (e.g. NodeViewWrapper style prop).
 */
export function getEmbedStyleObject(attrs: EmbedAttrs): Record<string, string> {
  const { width = 'auto', align = 'center', wrap = 'none' } = attrs;
  const style: Record<string, string> = {};

  if (width && width !== 'auto') {
    style['width'] = width;
  }

  if (wrap === 'left') {
    style['float'] = 'left';
    style['marginRight'] = '1rem';
    style['marginBottom'] = '0.5rem';
  } else if (wrap === 'right') {
    style['float'] = 'right';
    style['marginLeft'] = '1rem';
    style['marginBottom'] = '0.5rem';
  } else {
    style['display'] = 'block';
    if (align === 'left') {
      style['marginLeft'] = '0';
      style['marginRight'] = 'auto';
    } else if (align === 'right') {
      style['marginLeft'] = 'auto';
      style['marginRight'] = '0';
    } else {
      style['marginLeft'] = 'auto';
      style['marginRight'] = 'auto';
    }
  }

  return style;
}

/** Shared attribute definitions for width / align / wrap on embed nodes (div-based). */
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
};
