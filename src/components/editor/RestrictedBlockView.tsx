import React, { useState } from 'react';
import { cn } from '../../lib/cn';

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
    <div className="RestrictedBlockView-root relative bg-[var(--color-restricted-bg)] p-3 rounded-md my-3">
      <div className="RestrictedBlockView-title font-semibold mb-1.5">{title}</div>
      {hasAccess ? (
        <>
          <button
            onClick={() => setRevealed((r) => !r)}
          className={cn(
              "RestrictedBlockView-revealBtn absolute top-2.5 right-2.5 bg-gray-700 text-white rounded-md px-4 py-1 font-semibold shadow transition-colors cursor-pointer z-[1]",
              revealed && "bg-indigo-600"
            )}
            aria-label={revealed ? 'Hide restricted content' : 'Reveal restricted content'}
          >
            {revealed ? 'Hide' : 'Reveal'}
          </button>
          <div className="RestrictedBlockView-content" style={{ minHeight: 32, marginTop: 16 }}>{revealed && <div>{children}</div>}</div>
        </>
      ) : (
        <div className="RestrictedBlockView-noAccess opacity-70 text-gray-400 mt-2">
          <span>Restricted</span>
        </div>
      )}
    </div>
  );
};

export default RestrictedBlockView;
