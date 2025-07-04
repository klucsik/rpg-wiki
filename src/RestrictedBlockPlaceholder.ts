import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import RestrictedBlockPlaceholderView from './RestrictedBlockPlaceholderView';

export interface RestrictedBlockPlaceholderOptions {
  HTMLAttributes: Record<string, unknown>;
}

const RestrictedBlockPlaceholder = Node.create<RestrictedBlockPlaceholderOptions>({
  name: 'restrictedBlockPlaceholder',
  group: 'block',
  content: '', // Empty content - this is a leaf node
  atom: true, // This makes it atomic (non-editable)
  selectable: true,
  draggable: true,
  isolating: false, // Changed to false since it's a leaf node
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },
  addAttributes() {
    return {
      blockId: {
        default: '',
        parseHTML: element => element.getAttribute('data-block-id') || '',
        renderHTML: attributes => {
          return { 'data-block-id': attributes.blockId };
        },
      },
      originalUsergroups: {
        default: '[]',
        parseHTML: element => element.getAttribute('data-original-usergroups') || '[]',
        renderHTML: attributes => {
          return { 'data-original-usergroups': attributes.originalUsergroups };
        },
      },
      originalEditgroups: {
        default: '[]',
        parseHTML: element => element.getAttribute('data-original-editgroups') || '[]',
        renderHTML: attributes => {
          return { 'data-original-editgroups': attributes.originalEditgroups };
        },
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-block-type="restricted-placeholder"]',
      },
    ];
  },
  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      mergeAttributes(
        HTMLAttributes,
        {
          'data-block-type': 'restricted-placeholder',
          'data-block-id': node.attrs.blockId,
          'data-original-usergroups': node.attrs.originalUsergroups,
          'data-original-editgroups': node.attrs.originalEditgroups,
          class: 'restricted-block-placeholder-html',
        }
      ),
      // No content hole for leaf nodes
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(RestrictedBlockPlaceholderView);
  },
  // Allow move/copy but prevent deletion
  addKeyboardShortcuts() {
    return {
      'Backspace': () => false, // Prevent deletion with backspace
      'Delete': () => false,    // Prevent deletion with delete key
    };
  },
});

export default RestrictedBlockPlaceholder;
