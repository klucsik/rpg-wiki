import React from 'react';
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import styles from './RestrictedBlock.module.css';

const RestrictedBlockPlaceholderView = (props: ReactNodeViewProps) => {
  const { node } = props;

  return (
    <NodeViewWrapper as="div"
      className={styles.restrictedBlock}
      data-block-type="restricted-placeholder"
      data-block-id={node.attrs.blockId}
      data-original-usergroups={node.attrs.originalUsergroups}
      data-original-editgroups={node.attrs.originalEditgroups}
      style={{ position: 'relative' }}
    >
      <div className={styles.restrictedTitle}>🔒 Restricted Content</div>
      <div className={styles.restrictedNoAccess}>
        <span>You don't have permission to view or edit this content.</span>
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
