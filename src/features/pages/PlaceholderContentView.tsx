import React from 'react';

interface PlaceholderContentViewProps {
  blockId: string;
  originalUsergroups: string;
  originalEditgroups: string;
  originalTitle?: string;
  allowedGroups?: string;
}

const PlaceholderContentView: React.FC<PlaceholderContentViewProps> = ({ 
  blockId, 
  originalUsergroups, 
  originalEditgroups,
  originalTitle,
  allowedGroups
}) => {
  // Parse allowed groups for display
  const groups = (() => {
    try {
      return allowedGroups ? JSON.parse(allowedGroups) : [];
    } catch {
      return [];
    }
  })();

  return (
    <div 
      className="bg-[var(--color-restricted-bg)] p-3 rounded-md my-3"
      data-block-type="restricted-placeholder"
      data-block-id={blockId}
      data-original-usergroups={originalUsergroups}
      data-original-editgroups={originalEditgroups}
      data-original-title={originalTitle}
      data-allowed-groups={allowedGroups}
      style={{ position: 'relative' }}
    >
      <div className="font-semibold mb-1.5">🔒 {originalTitle || 'Restricted Content'}</div>
        <div className="opacity-70 text-gray-400 mt-2">
        <span>You don&apos;t have permission to view this content.</span>
        {groups.length > 0 && (
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#9ca3af' }}>
            Required groups: {groups.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaceholderContentView;
