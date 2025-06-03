import React, { useState } from 'react';
import { RESTRICTED_BLOCK_BG } from './RestrictedBlock';
import { useUserStore } from './userStore';

interface RestrictedBlockViewProps {
  title: string;
  usergroups: string[];
  children: React.ReactNode;
}

const RestrictedBlockView: React.FC<RestrictedBlockViewProps> = ({ title, usergroups, children }) => {
  const [revealed, setRevealed] = useState(false);
  const user = useUserStore((state) => state.user);
  const hasAccess = user && usergroups.some((g) => user.groups.includes(g));

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
        <button disabled style={{ opacity: 0.5 }}>Restricted</button>
      )}
    </div>
  );
};

export default RestrictedBlockView;
