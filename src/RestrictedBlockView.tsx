import React, { useState } from 'react';
import { RESTRICTED_BLOCK_BG } from './RestrictedBlock';

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
    <div style={{ background: RESTRICTED_BLOCK_BG, padding: 12, borderRadius: 6, margin: '12px 0' }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{title}</div>
      {hasAccess ? (
        <>
          <button onClick={() => setRevealed((r) => !r)} style={{ marginBottom: 8 }}>
            {revealed ? 'Hide' : 'Reveal'}
          </button>
          {revealed && <div>{children}</div>}
        </>
      ) : (
        <div style={{ opacity: 0.7, color: '#bbb', marginTop: 8 }}>
          <span>Restricted</span>
        </div>
      )}
    </div>
  );
};

export default RestrictedBlockView;
