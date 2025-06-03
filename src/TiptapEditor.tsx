import React from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TipTapLink from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import RestrictedBlock from './RestrictedBlock';

interface TiptapEditorProps {
  value: string;
  onChange: (val: string) => void;
}

export function TiptapEditor({ value, onChange }: TiptapEditorProps) {
  // Only set initial content on first mount
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      TipTapLink,
      Placeholder.configure({ placeholder: 'Start typing your wiki content...' }),
      RestrictedBlock,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (html !== value) {
        onChange(html);
      }
    },
  }, []); // Only create the editor once

  // Only update editor content if value changes AND editor is not focused
  React.useEffect(() => {
    if (!editor) return;
    if (!editor.isFocused && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  // Dropdown for block type selection
  const [blockType, setBlockType] = React.useState('paragraph');
  const blockOptions = [
    { label: 'Paragraph', value: 'paragraph' },
    { label: 'Heading 1', value: 'heading-1' },
    { label: 'Heading 2', value: 'heading-2' },
    { label: 'Heading 3', value: 'heading-3' },
    { label: 'Heading 4', value: 'heading-4' },
    { label: 'Heading 5', value: 'heading-5' },
    { label: 'Heading 6', value: 'heading-6' },
    { label: 'Restricted Block', value: 'restricted' },
  ];

  const handleBlockTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!editor) return;
    const value = e.target.value;
    setBlockType(value);
    if (value === 'paragraph') {
      editor.chain().focus().setParagraph().run();
    } else if (value.startsWith('heading-')) {
      const level = Number(value.split('-')[1]) as 1|2|3|4|5|6;
      editor.chain().focus().toggleHeading({ level }).run();
    } else if (value === 'restricted') {
      const group = window.prompt('Enter allowed usergroups (comma separated)', 'admins,editors') || '';
      const groups = group.split(',').map(g => g.trim()).filter(Boolean);
      if (groups.length) {
        const { empty, from, to } = editor.state.selection;
        const title = window.prompt('Restricted Block Title', 'Restricted Block') || 'Restricted Block';
        if (!empty) {
          let selectedContent = editor.state.doc.cut(from, to).toJSON().content;
          if (!Array.isArray(selectedContent) || selectedContent.length === 0) {
            selectedContent = [
              { type: 'paragraph', content: [{ type: 'text', text: 'Restricted content here' }] }
            ];
          } else {
            selectedContent = selectedContent.filter(
              (node: any) => node.type === 'paragraph' || node.type === 'heading' || node.type === 'bulletList' || node.type === 'orderedList' || node.type === 'image' || node.type === 'horizontalRule'
            );
            if (selectedContent.length === 0) {
              selectedContent = [
                { type: 'paragraph', content: [{ type: 'text', text: 'Restricted content here' }] }
              ];
            }
          }
          editor.chain().focus().deleteSelection().insertContent({
            type: 'restrictedBlock',
            attrs: {
              usergroups: JSON.stringify(groups),
              title,
            },
            content: selectedContent,
          }).run();
        } else {
          editor.chain().focus().insertContent({
            type: 'restrictedBlock',
            attrs: {
              usergroups: JSON.stringify(groups),
              title,
            },
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: 'Restricted content here' }] },
            ],
          }).run();
        }
      }
      setBlockType('paragraph');
    }
  };

  if (!editor) return null;

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 4, padding: 8, minHeight: 120 }}>
      {/* Toolbar */}
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={blockType} onChange={handleBlockTypeChange} style={{ minWidth: 140 }}>
          {blockOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run()} style={{ fontWeight: editor.isActive('bold') ? 'bold' : undefined }}>B</button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run()} style={{ fontStyle: editor.isActive('italic') ? 'italic' : undefined }}>I</button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().chain().focus().toggleStrike().run()} style={{ textDecoration: editor.isActive('strike') ? 'line-through' : undefined }}>S</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} disabled={!editor.can().chain().focus().toggleBulletList().run()}>• List</button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} disabled={!editor.can().chain().focus().toggleOrderedList().run()}>1. List</button>
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()}>―</button>
        <button type="button" onClick={() => {
          const url = window.prompt('Image URL');
          if (url) editor.chain().focus().setImage({ src: url }).run();
        }}>Img</button>
        <button type="button" onClick={() => {
          const url = window.prompt('Link URL');
          if (url) editor.chain().focus().toggleLink({ href: url }).run();
        }}>Link</button>
        <button type="button" onClick={() => editor.chain().focus().unsetLink().run()}>Unlink</button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
