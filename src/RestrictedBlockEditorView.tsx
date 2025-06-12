import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';

const RestrictedBlockEditorView = (props: any) => {
  const { editor, node, getPos } = props;
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
    <NodeViewWrapper as="div" style={{ background: '#233779', padding: 8, border: '1px dashed #c00', position: 'relative', borderRadius: 6, margin: '8px 0' }} data-block-type="restricted" data-usergroups={node.attrs.usergroups} data-title={node.attrs.title}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontWeight: 'bold', color: '#fff' }}>{node.attrs.title}</span>
        <button type="button" onClick={removeRestriction} style={{ fontSize: 10, padding: '2px 6px', marginLeft: 8, background: '#fff', color: '#233779', border: '1px solid #c00', borderRadius: 4, cursor: 'pointer' }}>Remove Restriction</button>
      </div>
      <NodeViewContent as="div" />
    </NodeViewWrapper>
  );
};

export default RestrictedBlockEditorView;
