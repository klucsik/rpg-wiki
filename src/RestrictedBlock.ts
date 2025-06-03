import { Node, mergeAttributes } from '@tiptap/core';

export interface RestrictedBlockOptions {
  HTMLAttributes: Record<string, any>;
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
          style: 'background:#233779;padding:8px;border:1px dashed #c00;',
        }
      ),
      0 // content hole as the only child
    ];
  },
});

export const RESTRICTED_BLOCK_BG = '#233779';

export default RestrictedBlock;
