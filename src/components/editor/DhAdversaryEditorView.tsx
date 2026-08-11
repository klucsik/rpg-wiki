import React from 'react';
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import { getEmbedStyleObject } from './embedFormatting';
import { EmbedDragHandle } from './EmbedDragHandle';
import { DhRichTextField } from './DhRichTextField';
import { BLOCK_TYPES } from '../../lib/block-types';

const DhAdversaryEditorView = ({ node, updateAttributes, selected }: ReactNodeViewProps) => {
  const attrs = node.attrs as Record<string, string>;

  const updateField = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    updateAttributes?.({ [field]: e.target.value });
  };

  const currentFeaturesHtml = attrs.featuresHtml || '<p>Feature Name - <em>Passive</em>: Describe effect here.</p>';

  return (
    <NodeViewWrapper
      as="div"
      className={`DhAdversaryEditor-root DhForm-root dh-adversary-html EmbedNode-root EmbedNode-dhAdversary my-4 ${selected ? 'ring-2 ring-blue-500 is-selected' : ''}`}
      data-block-type={BLOCK_TYPES.DH_ADVERSARY}
      style={{ ...getEmbedStyleObject({ width: attrs.width, align: attrs.align, wrap: attrs.wrap }), position: 'relative' }}
      data-name={attrs.name || ''}
      data-tier={attrs.tier || ''}
      data-role={attrs.role || ''}
      data-flavor={attrs.flavor || ''}
      data-motives-tactics={attrs.motivesTactics || ''}
      data-difficulty={attrs.difficulty || ''}
      data-thresholds={attrs.thresholds || ''}
      data-hp={attrs.hp || ''}
      data-stress={attrs.stress || ''}
      data-atk={attrs.atk || ''}
      data-experience={attrs.experience || ''}
      data-features-html={currentFeaturesHtml}
    >
      <EmbedDragHandle label="Adversary" />
      <div className="DhAdversaryEditor-header mb-3">
        <input
          type="text"
          value={attrs.name || ''}
          onChange={updateField('name')}
          placeholder="Adversary name"
          className="DhAdversaryEditor-nameInput w-full"
        />
      </div>

      <div className="DhAdversaryEditor-subHeader grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
        <input
          type="text"
          value={attrs.tier || ''}
          onChange={updateField('tier')}
          placeholder="Tier (e.g. Tier 4 Solo)"
          className="DhAdversaryEditor-tierInput"
        />
        <input
          type="text"
          value={attrs.role || ''}
          onChange={updateField('role')}
          placeholder="Role (e.g. Beast, Humanoid, Undead)"
          className="DhAdversaryEditor-roleInput"
        />
      </div>

      <textarea
        value={attrs.flavor || ''}
        onChange={updateField('flavor')}
        placeholder="Flavor text"
        className="DhAdversaryEditor-flavorInput w-full mb-2"
        rows={2}
      />

      <textarea
        value={attrs.motivesTactics || ''}
        onChange={updateField('motivesTactics')}
        placeholder="Motives & Tactics"
        className="DhAdversaryEditor-motivesInput w-full mb-3"
        rows={2}
      />

      <div className="DhAdversaryEditor-stats grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
        <div>
          <div className="DhAdversaryEditor-statLabel">Difficulty</div>
          <input
            type="text"
            value={attrs.difficulty || ''}
            onChange={updateField('difficulty')}
            placeholder="10"
            className="DhAdversaryEditor-statInput"
          />
        </div>
        <div>
          <div className="DhAdversaryEditor-statLabel">Thresholds</div>
          <input
            type="text"
            value={attrs.thresholds || ''}
            onChange={updateField('thresholds')}
            placeholder="None"
            className="DhAdversaryEditor-statInput"
          />
        </div>
        <div>
          <div className="DhAdversaryEditor-statLabel">HP</div>
          <input
            type="text"
            value={attrs.hp || ''}
            onChange={updateField('hp')}
            placeholder="1"
            className="DhAdversaryEditor-statInput"
          />
        </div>
        <div>
          <div className="DhAdversaryEditor-statLabel">Stress</div>
          <input
            type="text"
            value={attrs.stress || ''}
            onChange={updateField('stress')}
            placeholder="1"
            className="DhAdversaryEditor-statInput"
          />
        </div>
      </div>

      <div className="DhAdversaryEditor-atkWrap mb-3">
        <div className="DhAdversaryEditor-statLabel">ATK</div>
        <input
          type="text"
          value={attrs.atk || ''}
          onChange={updateField('atk')}
          placeholder="+0 | Strike: Melee | 1d6 phy"
          className="DhAdversaryEditor-statInput"
        />
      </div>

      <div className="DhAdversaryEditor-statLabel">Experiences</div>
      <input
        type="text"
        value={attrs.experience || ''}
        onChange={updateField('experience')}
        placeholder="bonking PCs in da head +2"
        className="DhAdversaryEditor-experienceInput w-full mb-3"
      />

      <DhRichTextField
        label="Features"
        valueHtml={currentFeaturesHtml}
        onChange={(html) => {
          if (html !== (attrs.featuresHtml || '')) {
            updateAttributes?.({ featuresHtml: html });
          }
        }}
        classNamePrefix="DhAdversaryEditor"
        helpText="Use the mini toolbar above for feature formatting."
      />
    </NodeViewWrapper>
  );
};

export default DhAdversaryEditorView;
