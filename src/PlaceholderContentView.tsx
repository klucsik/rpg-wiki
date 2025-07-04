import React from 'react';
import styles from './RestrictedBlock.module.css';

interface PlaceholderContentViewProps {
  blockId: string;
  originalUsergroups: string;
  originalEditgroups: string;
}

const PlaceholderContentView: React.FC<PlaceholderContentViewProps> = ({ 
  blockId, 
  originalUsergroups, 
  originalEditgroups 
}) => {
  return (
    <div 
      className={styles.restrictedBlock}
      data-block-type="restricted-placeholder"
      data-block-id={blockId}
      data-original-usergroups={originalUsergroups}
      data-original-editgroups={originalEditgroups}
      style={{ position: 'relative' }}
    >
      <div className={styles.restrictedTitle}>🔒 Restricted Content</div>
      <div className={styles.restrictedNoAccess}>
        <span>You don't have permission to view this content.</span>
      </div>
    </div>
  );
};

export default PlaceholderContentView;
