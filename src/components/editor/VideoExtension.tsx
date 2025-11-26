import { Node, mergeAttributes } from '@tiptap/core';

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
    let style = HTMLAttributes.style || '';
    if (HTMLAttributes.width && HTMLAttributes.width !== 'auto') {
      style += `width:${HTMLAttributes.width};`;
    }
    // Alignment logic: access align from either the attribute directly or data-align
    const align = HTMLAttributes.align || HTMLAttributes['data-align'] || 'center';
    if (align === 'left') {
      style += 'display:block;margin-left:0;margin-right:auto;';
    } else if (align === 'right') {
      style += 'display:block;margin-left:auto;margin-right:0;';
    } else if (align === 'center') {
      style += 'display:block;margin-left:auto;margin-right:auto;';
    } else {
      style += 'display:block;';
    }
    
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
});
