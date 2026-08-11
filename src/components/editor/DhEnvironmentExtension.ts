import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import DhEnvironmentEditorView from './DhEnvironmentEditorView';
import { getEmbedCssStyle, sharedEmbedAttributes } from './embedFormatting';
import { BLOCK_TYPES } from '../../lib/block-types';

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    dhEnvironment: {
      insertDhEnvironment: () => ReturnType;
    };
  }
}

export const DhEnvironmentNode = Node.create({
  name: 'dhEnvironment',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      name: {
        default: 'Abandoned Mine',
        parseHTML: (element) => element.getAttribute('data-name') || 'Abandoned Mine',
        renderHTML: (attributes) => ({ 'data-name': attributes.name }),
      },
      tierType: {
        default: 'Tier 1 Exploration',
        parseHTML: (element) => element.getAttribute('data-tier-type') || 'Tier 1 Exploration',
        renderHTML: (attributes) => ({ 'data-tier-type': attributes.tierType }),
      },
      flavor: {
        default: 'A dangerous location filled with history and hazards.',
        parseHTML: (element) => element.getAttribute('data-flavor') || 'A dangerous location filled with history and hazards.',
        renderHTML: (attributes) => ({ 'data-flavor': attributes.flavor }),
      },
      impulses: {
        default: 'Impulses: Pressure intruders, reveal hidden danger, drain resources.',
        parseHTML: (element) => element.getAttribute('data-impulses') || 'Impulses: Pressure intruders, reveal hidden danger, drain resources.',
        renderHTML: (attributes) => ({ 'data-impulses': attributes.impulses }),
      },
      difficulty: {
        default: '11',
        parseHTML: (element) => element.getAttribute('data-difficulty') || '11',
        renderHTML: (attributes) => ({ 'data-difficulty': attributes.difficulty }),
      },
      potentialAdversaries: {
        default: 'Any undead, giant rats, toxic flora',
        parseHTML: (element) => element.getAttribute('data-potential-adversaries') || 'Any undead, giant rats, toxic flora',
        renderHTML: (attributes) => ({ 'data-potential-adversaries': attributes.potentialAdversaries }),
      },
      featuresHtml: {
        default: '<p>Feature Name - <em>Passive</em>: Describe effect here.</p>',
        parseHTML: (element) =>
          element.getAttribute('data-features-html') ||
          (element.getAttribute('data-features-text') ? `<p>${element.getAttribute('data-features-text')}</p>` : '<p>Feature Name - <em>Passive</em>: Describe effect here.</p>'),
        renderHTML: (attributes) => ({ 'data-features-html': attributes.featuresHtml }),
      },
      ...sharedEmbedAttributes,
    };
  },

  parseHTML() {
    return [{ tag: `div[data-block-type="${BLOCK_TYPES.DH_ENVIRONMENT}"]` }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const style = getEmbedCssStyle({
      width: HTMLAttributes['data-width'],
      align: HTMLAttributes['data-align'],
      wrap: HTMLAttributes['data-wrap'],
    });

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-block-type': BLOCK_TYPES.DH_ENVIRONMENT,
        class: 'dh-environment-html',
        style,
        'data-name': node.attrs.name,
        'data-tier-type': node.attrs.tierType,
        'data-flavor': node.attrs.flavor,
        'data-impulses': node.attrs.impulses,
        'data-difficulty': node.attrs.difficulty,
        'data-potential-adversaries': node.attrs.potentialAdversaries,
        'data-features-html': node.attrs.featuresHtml,
        'data-features-text': stripTags(String(node.attrs.featuresHtml || '')),
      }),
      ['div', { class: 'dh-environment-name' }, node.attrs.name],
      ['div', { class: 'dh-environment-tier-type' }, node.attrs.tierType],
      ['div', { class: 'dh-environment-flavor' }, node.attrs.flavor],
      ['div', { class: 'dh-environment-impulses' }, node.attrs.impulses],
      ['div', { class: 'dh-environment-core' },
        ['span', { class: 'dh-environment-core-label' }, 'Difficulty: '],
        ['span', { class: 'dh-environment-core-value' }, node.attrs.difficulty],
      ],
      ['div', { class: 'dh-environment-core' },
        ['span', { class: 'dh-environment-core-label' }, 'Potential Adversaries: '],
        ['span', { class: 'dh-environment-core-value' }, node.attrs.potentialAdversaries],
      ],
      ['div', { class: 'dh-environment-features-title' }, 'FEATURES'],
      ['div', { class: 'dh-environment-features-text' }, stripTags(String(node.attrs.featuresHtml || ''))],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DhEnvironmentEditorView);
  },

  addCommands() {
    return {
      insertDhEnvironment: () => ({ commands }) => {
        return commands.insertContent({ type: this.name });
      },
    };
  },
});
