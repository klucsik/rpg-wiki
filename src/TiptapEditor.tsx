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

  if (!editor) return null;

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 4, padding: 8, minHeight: 120 }}>
      {/* Toolbar */}
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run()} style={{ fontWeight: editor.isActive('bold') ? 'bold' : undefined }}>B</button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run()} style={{ fontStyle: editor.isActive('italic') ? 'italic' : undefined }}>I</button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().chain().focus().toggleStrike().run()} style={{ textDecoration: editor.isActive('strike') ? 'line-through' : undefined }}>S</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} disabled={!editor.can().chain().focus().toggleBulletList().run()}>• List</button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} disabled={!editor.can().chain().focus().toggleOrderedList().run()}>1. List</button>
        <button type="button" onClick={() => editor.chain().focus().setParagraph().run()}>P</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
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
        <button type="button" onClick={() => {
          // Insert a restricted block at the current selection
          const group = window.prompt('Enter allowed usergroups (comma separated)', 'admins,editors') || '';
          const groups = group.split(',').map(g => g.trim()).filter(Boolean);
          if (groups.length) {
            editor.commands.insertContent({
              type: 'restrictedBlock',
              attrs: { usergroups: JSON.stringify(groups), title: window.prompt('Restricted Block Title', 'Restricted Block') || 'Restricted Block' },
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'Restricted content here' }] }
              ]
            });
          }
        }}>Restricted Block</button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
