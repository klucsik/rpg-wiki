import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import DhAdversaryEditorView from './DhAdversaryEditorView';
import { getEmbedCssStyle, sharedEmbedAttributes } from './embedFormatting';
import { BLOCK_TYPES } from '../../lib/block-types';

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    dhAdversary: {
      insertDhAdversary: () => ReturnType;
    };
  }
}

export const DhAdversaryNode = Node.create({
  name: 'dhAdversary',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      name: {
        default: 'New Adversary',
        parseHTML: element => element.getAttribute('data-name') || 'New Adversary',
        renderHTML: attributes => ({ 'data-name': attributes.name }),
      },
      tier: {
        default: 'Tier 1 Minion',
        parseHTML: element => element.getAttribute('data-tier') || 'Tier 1 Minion',
        renderHTML: attributes => ({ 'data-tier': attributes.tier }),
      },
      role: {
        default: 'Humanoid',
        parseHTML: element => element.getAttribute('data-role') || 'Humanoid',
        renderHTML: attributes => ({ 'data-role': attributes.role }),
      },
      flavor: {
        default: 'A dangerous foe with a story to tell.',
        parseHTML: element => element.getAttribute('data-flavor') || 'A dangerous foe with a story to tell.',
        renderHTML: attributes => ({ 'data-flavor': attributes.flavor }),
      },
      motivesTactics: {
        default: 'Motives & Tactics: Add concise behavior cues here.',
        parseHTML: element => element.getAttribute('data-motives-tactics') || 'Motives & Tactics: Add concise behavior cues here.',
        renderHTML: attributes => ({ 'data-motives-tactics': attributes.motivesTactics }),
      },
      difficulty: {
        default: '10',
        parseHTML: element => element.getAttribute('data-difficulty') || '10',
        renderHTML: attributes => ({ 'data-difficulty': attributes.difficulty }),
      },
      thresholds: {
        default: 'None',
        parseHTML: element => element.getAttribute('data-thresholds') || 'None',
        renderHTML: attributes => ({ 'data-thresholds': attributes.thresholds }),
      },
      hp: {
        default: '1',
        parseHTML: element => element.getAttribute('data-hp') || '1',
        renderHTML: attributes => ({ 'data-hp': attributes.hp }),
      },
      stress: {
        default: '1',
        parseHTML: element => element.getAttribute('data-stress') || '1',
        renderHTML: attributes => ({ 'data-stress': attributes.stress }),
      },
      atk: {
        default: '+0 | Strike: Melee | 1d6 phy',
        parseHTML: element => element.getAttribute('data-atk') || '+0 | Strike: Melee | 1d6 phy',
        renderHTML: attributes => ({ 'data-atk': attributes.atk }),
      },
      experience: {
        default: 'bonking PCs in da head +2',
        parseHTML: element => element.getAttribute('data-experience') || 'bonking PCs in da head +2',
        renderHTML: attributes => ({ 'data-experience': attributes.experience }),
      },
      featuresHtml: {
        default: '<p>Feature Name - <em>Passive</em>: Describe effect here.</p>',
        parseHTML: element =>
          element.getAttribute('data-features-html') ||
          (element.getAttribute('data-features-text') ? `<p>${element.getAttribute('data-features-text')}</p>` : '<p>Feature Name - <em>Passive</em>: Describe effect here.</p>'),
        renderHTML: attributes => ({ 'data-features-html': attributes.featuresHtml }),
      },
      ...sharedEmbedAttributes,
    };
  },

  parseHTML() {
    return [
      {
        tag: `div[data-block-type="${BLOCK_TYPES.DH_ADVERSARY}"]`,
      },
    ];
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
        'data-block-type': BLOCK_TYPES.DH_ADVERSARY,
        class: 'dh-adversary-html',
        style,
        'data-name': node.attrs.name,
        'data-tier': node.attrs.tier,
        'data-role': node.attrs.role,
        'data-flavor': node.attrs.flavor,
        'data-motives-tactics': node.attrs.motivesTactics,
        'data-difficulty': node.attrs.difficulty,
        'data-thresholds': node.attrs.thresholds,
        'data-hp': node.attrs.hp,
        'data-stress': node.attrs.stress,
        'data-atk': node.attrs.atk,
        'data-experience': node.attrs.experience,
        'data-features-html': node.attrs.featuresHtml,
        'data-features-text': stripTags(String(node.attrs.featuresHtml || '')),
      }),
      ['div', { class: 'dh-adversary-name' }, node.attrs.name],
      ['div', { class: 'dh-adversary-tier-role' }, `${node.attrs.tier} ${node.attrs.role ? `| ${node.attrs.role}` : ''}`],
      ['div', { class: 'dh-adversary-flavor' }, node.attrs.flavor],
      ['div', { class: 'dh-adversary-motives' }, node.attrs.motivesTactics],
      ['div', { class: 'dh-adversary-stats' },
        ['span', { class: 'dh-adversary-stat' }, `Difficulty: ${node.attrs.difficulty}`],
        ['span', { class: 'dh-adversary-stat' }, `Thresholds: ${node.attrs.thresholds}`],
        ['span', { class: 'dh-adversary-stat' }, `HP: ${node.attrs.hp}`],
        ['span', { class: 'dh-adversary-stat' }, `Stress: ${node.attrs.stress}`],
      ],
      ['div', { class: 'dh-adversary-atk' }, `ATK: ${node.attrs.atk}`],
      ['div', { class: 'dh-adversary-experience-title' }, 'EXPERIENCES'],
      ['div', { class: 'dh-adversary-experience' }, node.attrs.experience],
      ['div', { class: 'dh-adversary-features-title' }, 'FEATURES'],
      ['div', { class: 'dh-adversary-features-text' }, stripTags(String(node.attrs.featuresHtml || ''))],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DhAdversaryEditorView);
  },

  addCommands() {
    return {
      insertDhAdversary: () => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
        });
      },
    };
  },
});
