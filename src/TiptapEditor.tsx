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
    immediatelyRender: false, // Fix SSR hydration mismatch
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
      // Insert a new restricted block with default title and group, no popups
      editor.chain().focus().insertContent({
        type: 'restrictedBlock',
        attrs: {
          usergroups: JSON.stringify(['public']),
          title: 'Restricted Block',
        },
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Restricted content here' }] },
        ],
      }).run();
      setBlockType('paragraph');
    }
  };

  if (!editor) return null;

  return (
    <div className="border border-gray-700 rounded-lg bg-gray-900 flex flex-col h-full w-full min-h-0">
      {/* Toolbar */}
      <nav className="flex flex-wrap items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <select
          value={blockType}
          onChange={handleBlockTypeChange}
          className="min-w-[140px] px-2 py-1 rounded bg-gray-900 text-indigo-100 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-700"
        >
          {blockOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run()} className={`px-2 py-1 rounded font-bold ${editor.isActive('bold') ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-indigo-100'} hover:bg-indigo-700 transition`}>B</button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run()} className={`px-2 py-1 rounded italic ${editor.isActive('italic') ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-indigo-100'} hover:bg-indigo-700 transition`}>I</button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().chain().focus().toggleStrike().run()} className={`px-2 py-1 rounded ${editor.isActive('strike') ? 'bg-indigo-600 text-white line-through' : 'bg-gray-700 text-indigo-100'} hover:bg-indigo-700 transition`}>S</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} disabled={!editor.can().chain().focus().toggleBulletList().run()} className="px-2 py-1 rounded bg-gray-700 text-indigo-100 hover:bg-indigo-700 transition">• List</button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} disabled={!editor.can().chain().focus().toggleOrderedList().run()} className="px-2 py-1 rounded bg-gray-700 text-indigo-100 hover:bg-indigo-700 transition">1. List</button>
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className="px-2 py-1 rounded bg-gray-700 text-indigo-100 hover:bg-indigo-700 transition">―</button>
        <button type="button" onClick={() => {
          const url = window.prompt('Image URL');
          if (url) editor.chain().focus().setImage({ src: url }).run();
        }} className="px-2 py-1 rounded bg-gray-700 text-indigo-100 hover:bg-indigo-700 transition">Img</button>
        <button type="button" onClick={() => {
          const url = window.prompt('Link URL');
          if (url) editor.chain().focus().toggleLink({ href: url }).run();
        }} className="px-2 py-1 rounded bg-gray-700 text-indigo-100 hover:bg-indigo-700 transition">Link</button>
        <button type="button" onClick={() => editor.chain().focus().unsetLink().run()} className="px-2 py-1 rounded bg-gray-700 text-indigo-100 hover:bg-indigo-700 transition">Unlink</button>
      </nav>
      <div className="flex-1 min-h-0 overflow-y-auto" onClick={() => editor?.commands.focus() }>
        <EditorContent editor={editor} className="h-full w-full bg-transparent px-4 py-2 text-indigo-100 cursor-text" />
      </div>
    </div>
  );
}
