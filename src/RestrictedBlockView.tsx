import React, { useState } from 'react';
import { RESTRICTED_BLOCK_BG } from './RestrictedBlock';
import styles from './RestrictedBlock.module.css';

interface RestrictedBlockViewProps {
  title: string;
  usergroups: string[];
  children: React.ReactNode;
  user: { group: string; groups?: string[] };
}

const RestrictedBlockView: React.FC<RestrictedBlockViewProps> = ({ title, usergroups, children, user }) => {
  const [revealed, setRevealed] = useState(false);
  // Support both single group and multiple groups for user
  const userGroupList = user.groups || (user.group ? [user.group] : []);
  const hasAccess = userGroupList.some((g) => usergroups.includes(g));

  return (
    <div className={styles.restrictedBlock}>
      <div className={styles.restrictedTitle}>{title}</div>
      {hasAccess ? (
        <>
          <button onClick={() => setRevealed((r) => !r)} className={styles.revealButton}>
            {revealed ? 'Hide' : 'Reveal'}
          </button>
          {revealed && <div>{children}</div>}
        </>
      ) : (
        <div className={styles.restrictedNoAccess}>
          <span>Restricted</span>
        </div>
      )}
    </div>
  );
};

export default RestrictedBlockView;
