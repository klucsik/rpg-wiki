import React, { useState } from 'react';
import styles from './RestrictedBlock.module.css';

interface RestrictedBlockViewProps {
  title: string;
  usergroups: string[];
  children: React.ReactNode;
  user: { groups: string[] };
}

const RestrictedBlockView: React.FC<RestrictedBlockViewProps> = ({ title, usergroups, children, user }) => {
  const [revealed, setRevealed] = useState(false);
  const hasAccess = user.groups.some((g) => usergroups.includes(g));

  return (
    <div className={`RestrictedBlockView-root ${styles.restrictedBlock}`} style={{ position: 'relative' }}>
      <div className={`RestrictedBlockView-title ${styles.restrictedTitle}`}>{title}</div>
      {hasAccess ? (
        <>
          <button
            onClick={() => setRevealed((r) => !r)}
          className={
              revealed
                ? `RestrictedBlockView-revealBtn ${styles.revealButton} ${styles.revealButtonActive}`
                : `RestrictedBlockView-revealBtn ${styles.revealButton}`
            }
            aria-label={revealed ? 'Hide restricted content' : 'Reveal restricted content'}
          >
            {revealed ? 'Hide' : 'Reveal'}
          </button>
          <div className="RestrictedBlockView-content" style={{ minHeight: 32, marginTop: 16 }}>{revealed && <div>{children}</div>}</div>
        </>
      ) : (
        <div className={`RestrictedBlockView-noAccess ${styles.restrictedNoAccess}`}>
          <span>Restricted</span>
        </div>
      )}
    </div>
  );
};

export default RestrictedBlockView;
