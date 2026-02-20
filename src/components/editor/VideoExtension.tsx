import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { getEmbedCssStyle } from './embedFormatting';
import { VideoView } from './VideoView';

export interface VideoOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    video: {
      /**
       * Add a video
       */
      setVideo: (options: { src: string; width?: string; align?: string }) => ReturnType;
    };
  }
}

export const ResizableVideo = Node.create<VideoOptions>({
  name: 'video',

  group: 'block',

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: element => element.getAttribute('src'),
        renderHTML: attributes => {
          if (!attributes.src) return {};
          return { src: attributes.src };
        },
      },
      width: {
        default: 'auto',
        parseHTML: element => element.getAttribute('width') || element.style.width || 'auto',
        renderHTML: attributes => {
          if (!attributes.width || attributes.width === 'auto') return {};
          return { width: attributes.width };
        },
      },
      align: {
        default: 'center',
        parseHTML: element => element.getAttribute('data-align') || 'center',
        renderHTML: attributes => {
          if (!attributes.align) return {};
          return { 'data-align': attributes.align };
        },
      },
      wrap: {
        default: 'none',
        parseHTML: element => element.getAttribute('data-wrap') || 'none',
        renderHTML: attributes => {
          if (!attributes.wrap || attributes.wrap === 'none') return {};
          return { 'data-wrap': attributes.wrap };
        },
      },
      textBehaviour: {
        default: 'linebreak',
        parseHTML: element => element.getAttribute('data-text-behaviour') || 'linebreak',
        renderHTML: attributes => {
          if (!attributes.textBehaviour || attributes.textBehaviour === 'linebreak') return {};
          return { 'data-text-behaviour': attributes.textBehaviour };
        },
      },
      x: {
        default: '0',
        parseHTML: element => element.getAttribute('data-x') || '0',
        renderHTML: attributes => {
          if (!attributes.x || attributes.x === '0') return {};
          return { 'data-x': attributes.x };
        },
      },
      y: {
        default: '0',
        parseHTML: element => element.getAttribute('data-y') || '0',
        renderHTML: attributes => {
          if (!attributes.y || attributes.y === '0') return {};
          return { 'data-y': attributes.y };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'video',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const style = getEmbedCssStyle({
      width: HTMLAttributes.width,
      wrap: HTMLAttributes['data-wrap'] || HTMLAttributes.wrap,
      textBehaviour: HTMLAttributes['data-text-behaviour'] || HTMLAttributes.textBehaviour,
      x: HTMLAttributes['data-x'] || HTMLAttributes.x,
      y: HTMLAttributes['data-y'] || HTMLAttributes.y,
    });
    
    return [
      'video',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 
        style,
        controls: 'true',
      }),
    ];
  },

  addCommands() {
    return {
      setVideo:
        options =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoView);
  },
});
