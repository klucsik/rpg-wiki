import React, { useState } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { useUser } from './userContext';
import { useGroups } from "./groupsContext";

const RestrictedBlockEditorView = (props: any) => {
  const { editor, node, getPos, updateAttributes } = props;
  const { groups } = useGroups();
  // Parse groups from node.attrs.usergroups (stringified array)
  const initialGroups = (() => {
    try {
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
    <NodeViewWrapper as="div" style={{ background: '#233779', padding: 8, border: '1px dashed #c00', position: 'relative', borderRadius: 6, margin: '8px 0' }} data-block-type="restricted" data-usergroups={node.attrs.usergroups} data-title={title}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Restricted Block Title"
          style={{ fontWeight: 'bold', color: '#fff', background: 'rgba(0,0,0,0.2)', border: '1px solid #c00', borderRadius: 4, padding: '2px 8px', minWidth: 120 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {editingGroups ? (
            <div style={{ position: 'relative', zIndex: 10, background: '#232b4a', border: '1px solid #4f5b93', borderRadius: 4, padding: 8, minWidth: 120, boxShadow: '0 2px 8px #1a1a2a44' }}>
              <div style={{ marginBottom: 8, color: '#e0e7ff', fontWeight: 500 }}>Allowed Groups</div>
              {groups.map((g: string) => (
                <label key={g} style={{ display: 'block', color: '#e0e7ff', fontSize: 13, marginBottom: 2 }}>
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
                style={{ marginTop: 8, background: '#4f5b93', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 16px', fontWeight: 500, cursor: 'pointer', minWidth: 80, height: 32, fontSize: 14, boxShadow: '0 1px 2px #1a1a2a22' }}
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
                style={{ background: '#4f5b93', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 16px', fontWeight: 500, cursor: 'pointer', minWidth: 80, height: 32, fontSize: 14, boxShadow: '0 1px 2px #1a1a2a22' }}
              >
                Edit Groups
              </button>
            </>
          )}
          <button type="button" onClick={removeRestriction} style={{ background: '#2d3748', color: '#e0e7ff', border: 'none', borderRadius: 4, padding: '4px 16px', fontWeight: 500, cursor: 'pointer', minWidth: 80, height: 32, fontSize: 14, boxShadow: '0 1px 2px #1a1a2a22' }}>Remove restriction</button>
        </div>
      </div>
      <NodeViewContent as="div" />
    </NodeViewWrapper>
  );
};

export default RestrictedBlockEditorView;
