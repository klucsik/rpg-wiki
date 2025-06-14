import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import RestrictedBlockEditorView from './RestrictedBlockEditorView';

export interface RestrictedBlockOptions {
  HTMLAttributes: Record<string, unknown>;
}

const RestrictedBlock = Node.create<RestrictedBlockOptions>({
  name: 'restrictedBlock',
  group: 'block',
  content: 'block+',
  selectable: true,
  draggable: true,
  isolating: true,
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },
  addAttributes() {
    return {
      usergroups: {
        default: '[]',
        parseHTML: element => element.getAttribute('data-usergroups') || '[]',
        renderHTML: attributes => {
          return { 'data-usergroups': attributes.usergroups };
        },
      },
      title: {
        default: 'Restricted Block',
        parseHTML: element => element.getAttribute('data-title') || 'Restricted Block',
        renderHTML: attributes => {
          return { 'data-title': attributes.title };
        },
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-block-type="restricted"]',
      },
    ];
  },
  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      mergeAttributes(
        HTMLAttributes,
        {
          'data-block-type': 'restricted',
          'data-usergroups': node.attrs.usergroups,
          'data-title': node.attrs.title,
          class: 'restricted-block-html',
        }
      ),
      0,
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(RestrictedBlockEditorView);
  },
});

export const RESTRICTED_BLOCK_BG = '#233779';

export default RestrictedBlock;
