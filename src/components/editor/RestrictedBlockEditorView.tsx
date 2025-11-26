import React, { useState, useEffect } from 'react';
import { NodeViewWrapper, NodeViewContent, type ReactNodeViewProps } from '@tiptap/react';
import { useGroups } from "../../features/groups/groupsContext";
import { useUser } from "../../features/auth/userContext";
import styles from './RestrictedBlock.module.css';

// Remove custom props interface and use the generic ReactNodeViewProps from @tiptap/react
const RestrictedBlockEditorView = (props: ReactNodeViewProps) => {
  const { editor, node, getPos, updateAttributes } = props;
  const { groups } = useGroups();
  const { user } = useUser();
  
  // Parse usergroups (view permissions)
  const initialUserGroups = (() => {
    try {
      return JSON.parse(node.attrs.usergroups || '[]');
    } catch {
      return [];
    }
  })();
  
  // Parse editgroups (edit permissions) - default to current user if empty
  const initialEditGroups = (() => {
    try {
      const parsed = JSON.parse(node.attrs.editgroups || '[]');
      // If editgroups is empty or not set, default to current user's username
      if (parsed.length === 0 && user?.username) {
        return [user.username];
      }
      return parsed;
    } catch {
      // If parsing fails, default to current user's username
      return user?.username ? [user.username] : ['admin'];
    }
  })();
  
  const [title, setTitle] = useState(node.attrs.title || 'Restricted Block');
  const [selectedUserGroups, setSelectedUserGroups] = useState<string[]>(initialUserGroups);
  const [selectedEditGroups, setSelectedEditGroups] = useState<string[]>(initialEditGroups);
  const [editingGroups, setEditingGroups] = useState(false);
  const [pendingUserGroups, setPendingUserGroups] = useState<string[]>(selectedUserGroups);
  const [pendingEditGroups, setPendingEditGroups] = useState<string[]>(selectedEditGroups);

  // Auto-save default editgroups when creating a new block
  useEffect(() => {
    if (initialEditGroups.length > 0 && (!node.attrs.editgroups || node.attrs.editgroups === '[]')) {
      if (updateAttributes) {
        updateAttributes({ editgroups: JSON.stringify(initialEditGroups) });
      }
    }
  }, [initialEditGroups, node.attrs.editgroups, updateAttributes]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    if (updateAttributes) updateAttributes({ title: e.target.value });
  };

  const handleUserGroupToggle = (group: string) => {
    setPendingUserGroups((prev: string[]) =>
      prev.includes(group)
        ? prev.filter((g: string) => g !== group)
        : [...prev, group]
    );
  };

  const handleEditGroupToggle = (group: string) => {
    setPendingEditGroups((prev: string[]) =>
      prev.includes(group)
        ? prev.filter((g: string) => g !== group)
        : [...prev, group]
    );
  };

  const handleSaveGroups = () => {
    setSelectedUserGroups(pendingUserGroups);
    setSelectedEditGroups(pendingEditGroups);
    if (updateAttributes) {
      updateAttributes({ 
        usergroups: JSON.stringify(pendingUserGroups),
        editgroups: JSON.stringify(pendingEditGroups)
      });
    }
    setEditingGroups(false);
  };

  const removeRestriction = () => {
    if (typeof getPos === 'function') {
      editor.commands.command(({ tr }) => {
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
      data-editgroups={node.attrs.editgroups}
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
              <div style={{ marginBottom: 12 }}>
                <div style={{ marginBottom: 8, color: '#e0e7ff', fontWeight: 500 }}>View Groups (who can see content)</div>
                {groups.map((g: string) => (
                  <label key={`view-${g}`} className={styles.restrictedGroupsLabel}>
                    <input
                      type="checkbox"
                      checked={pendingUserGroups.includes(g)}
                      onChange={() => handleUserGroupToggle(g)}
                      style={{ marginRight: 6 }}
                    />
                    {g}
                  </label>
                ))}
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ marginBottom: 8, color: '#e0e7ff', fontWeight: 500 }}>Edit Groups (who can edit this block)</div>
                {groups.map((g: string) => (
                  <label key={`edit-${g}`} className={styles.restrictedGroupsLabel}>
                    <input
                      type="checkbox"
                      checked={pendingEditGroups.includes(g)}
                      onChange={() => handleEditGroupToggle(g)}
                      style={{ marginRight: 6 }}
                    />
                    {g}
                  </label>
                ))}
              </div>
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
              <div style={{ color: '#e0e7ff', fontSize: 13, marginRight: 8 }}>
                <div>View: {selectedUserGroups.join(', ') || 'none'}</div>
                <div>Edit: {selectedEditGroups.join(', ') || 'none'}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPendingUserGroups(selectedUserGroups);
                  setPendingEditGroups(selectedEditGroups);
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
