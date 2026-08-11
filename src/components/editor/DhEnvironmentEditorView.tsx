import React from 'react';
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import { getEmbedStyleObject } from './embedFormatting';
import { EmbedDragHandle } from './EmbedDragHandle';
import { DhRichTextField } from './DhRichTextField';
import { BLOCK_TYPES } from '../../lib/block-types';

const DhEnvironmentEditorView = ({ node, updateAttributes, selected }: ReactNodeViewProps) => {
  const attrs = node.attrs as Record<string, string>;

  const updateField = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    updateAttributes?.({ [field]: e.target.value });
  };

  const currentFeaturesHtml = attrs.featuresHtml || '<p>Feature Name - <em>Passive</em>: Describe effect here.</p>';

  return (
    <NodeViewWrapper
      as="div"
      className={`DhEnvironmentEditor-root DhForm-root dh-environment-html EmbedNode-root EmbedNode-dhEnvironment my-4 ${selected ? 'ring-2 ring-blue-500 is-selected' : ''}`}
      data-block-type={BLOCK_TYPES.DH_ENVIRONMENT}
      style={{ ...getEmbedStyleObject({ width: attrs.width, align: attrs.align, wrap: attrs.wrap }), position: 'relative' }}
      data-name={attrs.name || ''}
      data-tier-type={attrs.tierType || ''}
      data-flavor={attrs.flavor || ''}
      data-impulses={attrs.impulses || ''}
      data-difficulty={attrs.difficulty || ''}
      data-potential-adversaries={attrs.potentialAdversaries || ''}
      data-features-html={currentFeaturesHtml}
    >
      <EmbedDragHandle label="Environment" />

      <div className="DhEnvironmentEditor-header mb-3">
        <input
          type="text"
          value={attrs.name || ''}
          onChange={updateField('name')}
          placeholder="Environment name"
          className="DhEnvironmentEditor-nameInput w-full"
        />
      </div>

      <input
        type="text"
        value={attrs.tierType || ''}
        onChange={updateField('tierType')}
        placeholder="Tier 1 Exploration"
        className="DhEnvironmentEditor-tierTypeInput w-full mb-3"
      />

      <textarea
        value={attrs.flavor || ''}
        onChange={updateField('flavor')}
        placeholder="A short thematic flavor sentence"
        className="DhEnvironmentEditor-flavorInput w-full mb-3"
        rows={2}
      />

      <div className="DhEnvironmentEditor-statLabel">Impulses</div>
      <textarea
        value={attrs.impulses || ''}
        onChange={updateField('impulses')}
        placeholder="What does this environment want to do?"
        className="DhEnvironmentEditor-impulsesInput w-full mb-3"
        rows={2}
      />

      <div className="DhEnvironmentEditor-coreInfo grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
        <div>
          <div className="DhEnvironmentEditor-statLabel">Difficulty</div>
          <input
            type="text"
            value={attrs.difficulty || ''}
            onChange={updateField('difficulty')}
            placeholder="11"
            className="DhEnvironmentEditor-statInput"
          />
        </div>
        <div>
          <div className="DhEnvironmentEditor-statLabel">Potential Adversaries</div>
          <input
            type="text"
            value={attrs.potentialAdversaries || ''}
            onChange={updateField('potentialAdversaries')}
            placeholder="Any undead, giant rats, toxic flora"
            className="DhEnvironmentEditor-statInput"
          />
        </div>
      </div>

      <DhRichTextField
        label="Features"
        valueHtml={currentFeaturesHtml}
        onChange={(html) => {
          if (html !== (attrs.featuresHtml || '')) {
            updateAttributes?.({ featuresHtml: html });
          }
        }}
        classNamePrefix="DhEnvironmentEditor"
        helpText="Use the mini toolbar above for feature formatting."
      />
    </NodeViewWrapper>
  );
};

export default DhEnvironmentEditorView;
