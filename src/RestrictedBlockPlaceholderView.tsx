import React from 'react';
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import styles from './RestrictedBlock.module.css';

const RestrictedBlockPlaceholderView = (props: ReactNodeViewProps) => {
  const { node } = props;

  // Parse allowed groups to display which groups can edit this block
  const allowedGroups = (() => {
    try {
      return JSON.parse(node.attrs.allowedGroups || '[]');
    } catch {
      return [];
    }
  })();

  return (
    <NodeViewWrapper as="div"
      className={styles.restrictedBlock}
      data-block-type="restricted-placeholder"
      data-block-id={node.attrs.blockId}
      data-original-usergroups={node.attrs.originalUsergroups}
      data-original-editgroups={node.attrs.originalEditgroups}
      data-original-title={node.attrs.originalTitle}
      data-original-content={node.attrs.originalContent}
      data-allowed-groups={node.attrs.allowedGroups}
      style={{ position: 'relative' }}
    >
      <div className={styles.restrictedTitle}>🔒 {node.attrs.originalTitle || 'Restricted Content'}</div>
      <div className={styles.restrictedNoAccess}>
        <span>You don&apos;t have permission to view or edit this content.</span>
        {allowedGroups.length > 0 && (
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#9ca3af' }}>
            Required groups: {allowedGroups.join(', ')}
          </div>
        )}
      </div>
      {/* Visual indicator that this is a placeholder */}
      <div style={{ 
        position: 'absolute', 
        top: '8px', 
        right: '8px', 
        fontSize: '12px',
        color: '#9ca3af',
        fontWeight: '500'
      }}>
        PLACEHOLDER
      </div>
    </NodeViewWrapper>
  );
};

export default RestrictedBlockPlaceholderView;
