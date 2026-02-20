import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { DrawioView } from './DrawioView';
import { getEmbedCssStyle, sharedEmbedAttributes } from './embedFormatting';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    drawio: {
      insertDrawio: (options?: { diagramXml?: string }) => ReturnType;
    };
  }
}

export const DrawioNode = Node.create({
  name: 'drawio',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      diagramXml: {
        default: '',
        parseHTML: el => el.getAttribute('data-diagram-xml') || '',
        renderHTML: attrs => {
          if (!attrs.diagramXml) return {};
          return { 'data-diagram-xml': attrs.diagramXml };
        },
      },
      diagramSvg: {
        default: '',
        parseHTML: el => el.getAttribute('data-diagram-svg') || '',
        renderHTML: attrs => {
          if (!attrs.diagramSvg) return {};
          return { 'data-diagram-svg': attrs.diagramSvg };
        },
      },
      ...sharedEmbedAttributes,
    };
  },

  parseHTML() {
    return [{ tag: 'div.drawio-diagram' }];
  },

  renderHTML({ HTMLAttributes }) {
    const style = getEmbedCssStyle({
      width: HTMLAttributes['data-width'],
      align: HTMLAttributes['data-align'],
      wrap: HTMLAttributes['data-wrap'],
    });
    return ['div', mergeAttributes(HTMLAttributes, { class: 'drawio-diagram', style })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DrawioView);
  },

  addCommands() {
    return {
      insertDrawio: (options?: { diagramXml?: string; diagramSvg?: string }) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            diagramXml: options?.diagramXml || '',
            diagramSvg: options?.diagramSvg || '',
          },
        });
      },
    };
  },
});
