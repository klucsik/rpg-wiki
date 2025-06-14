import React from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TipTapLink from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import RestrictedBlock from './RestrictedBlock';
import TextAlign from '@tiptap/extension-text-align';

interface TiptapEditorProps {
  value: string;
  onChange: (val: string) => void;
}

// Custom Image extension with resizable and alignment attributes
import { Node, mergeAttributes } from '@tiptap/core';

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: 'auto',
        parseHTML: element => element.getAttribute('width') || element.style.width || 'auto',
        renderHTML: attributes => {
          if (!attributes.width || attributes.width === 'auto') return {};
          return { width: attributes.width };
        },
      },
      align: {
        default: 'center',
        parseHTML: element => element.getAttribute('data-align') || 'center',
        renderHTML: attributes => {
          if (!attributes.align) return {};
          return { 'data-align': attributes.align };
        },
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    let style = HTMLAttributes.style || '';
    if (HTMLAttributes.width && HTMLAttributes.width !== 'auto') {
      style += `width:${HTMLAttributes.width};`;
    }
    // Alignment logic: only set margin for the selected alignment
    if (HTMLAttributes.align === 'left') {
      style += 'display:block;margin-left:0;margin-right:auto;';
    } else if (HTMLAttributes.align === 'right') {
      style += 'display:block;margin-left:auto;margin-right:0;';
    } else if (HTMLAttributes.align === 'center') {
      style += 'display:block;margin-left:auto;margin-right:auto;';
    } else {
      style += 'display:block;';
    }
    return [
      'img',
      mergeAttributes(HTMLAttributes, { style }),
    ];
  },
});

export function TiptapEditor({ value, onChange, pageEditGroups }: TiptapEditorProps & { pageEditGroups?: string[] }) {
  // Only set initial content on first mount
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      ResizableImage,
      TipTapLink,
      Placeholder.configure({ placeholder: 'Start typing your wiki content...' }),
      RestrictedBlock,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
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

  // Update blockType state to reflect current selection in the editor
  React.useEffect(() => {
    if (!editor) return;
    const { state } = editor;
    const { $from } = state.selection;
    const parent = $from.node($from.depth);
    if (parent.type.name === 'heading') {
      setBlockType(`heading-${parent.attrs.level}`);
    } else if (parent.type.name === 'paragraph') {
      setBlockType('paragraph');
    }
    // Do not update for restricted block, as it's an insert action only
  }, [editor && editor.state.selection]);

  const handleBlockTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!editor) return;
    const value = e.target.value;
    setBlockType(value);
    if (value === 'paragraph') {
      editor.chain().focus().setParagraph().run();
    } else if (value.startsWith('heading-')) {
      const level = Number(value.split('-')[1]) as 1|2|3|4|5|6;
      editor.chain().focus().setHeading({ level }).run();
    } else if (value === 'restricted') {
      // Insert a new restricted block with default title and group, using pageEditGroups if available
      editor.chain().focus().insertContent({
        type: 'restrictedBlock',
        attrs: {
          usergroups: JSON.stringify(pageEditGroups && pageEditGroups.length > 0 ? pageEditGroups : ['public']),
          title: 'Restricted Block',
        },
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Restricted content here' }] },
        ],
      }).run();
      setBlockType('paragraph');
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    // You may need to adjust the endpoint below to match your backend
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      const url = data.url;
      if (url && editor) {
        // Insert with default width and center alignment
        // Use setImage, then updateAttributes to set custom attributes
        editor.chain().focus().setImage({ src: url }).updateAttributes('image', { width: '300px', align: 'center' }).run();
      }
    } else {
      alert("Image upload failed");
    }
    // Reset file input so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Image resizing and alignment controls
  function setImageWidth(width: string) {
    if (!editor) return;
    const { state, view } = editor;
    const { selection } = state;
    const node = state.doc.nodeAt(selection.from);
    if (node && node.type.name === 'image') {
      editor.chain().focus().setNodeSelection(selection.from).updateAttributes('image', { width }).run();
    }
  }
  function setImageAlign(align: 'left' | 'center' | 'right') {
    if (!editor) return;
    const { state } = editor;
    const { selection } = state;
    // Try to find the image node in the selection or its parent
    let pos = selection.from;
    let node = state.doc.nodeAt(pos);
    if (!node || node.type.name !== 'image') {
      // Try to find an image node in the selection range
      let found = false;
      state.doc.nodesBetween(selection.from, selection.to, (n, p, parent, index) => {
        if (n.type.name === 'image' && !found) {
          node = n;
          pos = p;
          found = true;
        }
      });
    }
    if (node && node.type.name === 'image') {
      // Use updateAttributes directly, don't setNodeSelection (which can cause issues in some cases)
      editor.chain().focus().updateAttributes('image', { align }).run();
    }
  }

  if (!editor) return null;

  // Check if image is selected
  const isImageSelected = editor.isActive('image');
  let currentImageAttrs: any = {};
  if (isImageSelected) {
    const { state } = editor;
    const { selection } = state;
    const node = state.doc.nodeAt(selection.from);
    if (node && node.type.name === 'image') {
      currentImageAttrs = node.attrs;
    }
  }

  return (
    <div className="flex flex-col h-full w-full min-h-0">
      {/* Toolbar pinned below the main navbar, right of sidebar */}
      <nav className="flex flex-wrap items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700 fixed left-[320px] right-0 z-20 w-auto top-[56px]">
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
        <button type="button" onClick={() => fileInputRef.current?.click()} className="px-2 py-1 rounded bg-gray-700 text-indigo-100 hover:bg-indigo-700 transition">Img</button>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleImageUpload}
        />
        <button type="button" onClick={() => {
          const url = window.prompt('Link URL');
          if (url) editor.chain().focus().toggleLink({ href: url }).run();
        }} className="px-2 py-1 rounded bg-gray-700 text-indigo-100 hover:bg-indigo-700 transition">Link</button>
        <button type="button" onClick={() => editor.chain().focus().unsetLink().run()} className="px-2 py-1 rounded bg-gray-700 text-indigo-100 hover:bg-indigo-700 transition">Unlink</button>
        {/* Image controls: only show if image is selected */}
        {isImageSelected && (
          <div className="flex items-center gap-2 ml-4">
            <label className="text-indigo-200 text-xs">Width:</label>
            <input
              type="range"
              min="50"
              max="800"
              value={parseInt(currentImageAttrs.width || '300', 10)}
              onChange={e => setImageWidth(e.target.value + 'px')}
              className="w-32"
            />
            <input
              type="number"
              min="50"
              max="800"
              value={parseInt(currentImageAttrs.width || '300', 10)}
              onChange={e => setImageWidth(e.target.value + 'px')}
              className="w-16 px-1 py-0.5 rounded bg-gray-900 text-indigo-100 border border-gray-700 text-xs"
            />
            <label className="text-indigo-200 text-xs ml-2">Align:</label>
            <button type="button" onClick={() => setImageAlign('left')} className={`px-2 py-1 rounded ${currentImageAttrs.align === 'left' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-indigo-100'} hover:bg-indigo-700 transition`}>Left</button>
            <button type="button" onClick={() => setImageAlign('center')} className={`px-2 py-1 rounded ${currentImageAttrs.align === 'center' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-indigo-100'} hover:bg-indigo-700 transition`}>Center</button>
            <button type="button" onClick={() => setImageAlign('right')} className={`px-2 py-1 rounded ${currentImageAttrs.align === 'right' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-indigo-100'} hover:bg-indigo-700 transition`}>Right</button>
          </div>
        )}
      </nav>
      {/* Offset for  toolbar (48px) */}
      <div className="flex-1 min-h-0 overflow-y-auto pt-[48px]">
        <EditorContent 
          editor={editor} 
          className="h-full w-full bg-transparent px-4 py-2 text-indigo-100 cursor-text"
        />
      </div>
      <style jsx global>{`
        .ProseMirror, .is-empty.is-editor-empty {
          min-height: 500px;
        }
      `}</style>
    </div>
  );
}
