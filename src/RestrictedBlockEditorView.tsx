import React, { useState } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { useUser } from './userContext';
import { useGroups } from "./groupsContext";
import styles from './RestrictedBlock.module.css';

const RestrictedBlockEditorView = (props: any) => {
  const { editor, node, getPos, updateAttributes, pageEditGroups } = props;
  const { groups } = useGroups();
  // Use pageEditGroups as default if present, else fallback to node.attrs.usergroups
  const initialGroups = (() => {
    try {
      if (pageEditGroups && Array.isArray(pageEditGroups) && pageEditGroups.length > 0) {
        return pageEditGroups;
      }
      return JSON.parse(node.attrs.usergroups || '[]');
    } catch {
      return [];
    }
  })();
  const [title, setTitle] = useState(node.attrs.title || 'Restricted Block');
  const [selectedGroups, setSelectedGroups] = useState<string[]>(initialGroups);
  const [editingGroups, setEditingGroups] = useState(false);
  const [pendingGroups, setPendingGroups] = useState<string[]>(selectedGroups);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    updateAttributes && updateAttributes({ title: e.target.value });
  };

  const handleGroupToggle = (group: string) => {
    setPendingGroups((prev) =>
      prev.includes(group)
        ? prev.filter((g) => g !== group)
        : [...prev, group]
    );
  };

  const handleSaveGroups = () => {
    setSelectedGroups(pendingGroups);
    updateAttributes && updateAttributes({ usergroups: JSON.stringify(pendingGroups) });
    setEditingGroups(false);
  };

  const removeRestriction = () => {
    if (typeof getPos === 'function') {
      editor.commands.command(({ tr }: { tr: any }) => {
        const pos = getPos();
        const node = tr.doc.nodeAt(pos);
        if (!node) return false;
        const content = node.content;
        tr.replaceWith(pos, pos + node.nodeSize, content);
        return true;
      });
    }
  };

  return (
    <NodeViewWrapper as="div"
      className={styles.restrictedBlockEditor}
      data-block-type="restricted"
      data-usergroups={node.attrs.usergroups}
      data-title={title}
    >
      <div className={styles.restrictedBlockHeader}>
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Restricted Block Title"
          className={styles.restrictedTitleInput}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {editingGroups ? (
            <div className={styles.restrictedGroupsPanel}>
              <div style={{ marginBottom: 8, color: '#e0e7ff', fontWeight: 500 }}>Allowed Groups</div>
              {groups.map((g: string) => (
                <label key={g} className={styles.restrictedGroupsLabel}>
                  <input
                    type="checkbox"
                    checked={pendingGroups.includes(g)}
                    onChange={() => handleGroupToggle(g)}
                    style={{ marginRight: 6 }}
                  />
                  {g}
                </label>
              ))}
              <button
                type="button"
                onClick={handleSaveGroups}
                className={styles.restrictedGroupsSave}
              >
                Save
              </button>
            </div>
          ) : (
            <>
              <span style={{ color: '#e0e7ff', fontSize: 13, marginRight: 8 }}>
                {selectedGroups.length > 0 ? selectedGroups.join(', ') : <span style={{ opacity: 0.7 }}>No groups</span>}
              </span>
              <button
                type="button"
                onClick={() => {
                  setPendingGroups(selectedGroups);
                  setEditingGroups(true);
                }}
                className={styles.restrictedGroupsEdit}
              >
                Edit Groups
              </button>
            </>
          )}
          <button type="button" onClick={removeRestriction} className={styles.restrictedRemove}>Remove restriction</button>
        </div>
      </div>
      <NodeViewContent as="div" />
    </NodeViewWrapper>
  );
};

export default RestrictedBlockEditorView;
