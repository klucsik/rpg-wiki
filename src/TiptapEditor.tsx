import React from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TipTapLink from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import RestrictedBlock from './RestrictedBlock';
import TextAlign from '@tiptap/extension-text-align';
import { useUser } from "./userContext";
import styles from './Editor.module.css';

interface TiptapEditorProps {
  value: string;
  onChange: (val: string) => void;
}

// Custom Image extension with resizable and alignment attributes
import { mergeAttributes } from '@tiptap/core';

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
  const { user } = useUser();
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
    { label: 'Heading 1', value: 'heading', level: 1 },
    { label: 'Heading 2', value: 'heading', level: 2 },
    { label: 'Heading 3', value: 'heading', level: 3 },
    { label: 'Heading 4', value: 'heading', level: 4 },
    { label: 'Heading 5', value: 'heading', level: 5 },
    { label: 'Heading 6', value: 'heading', level: 6 },
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
  }, [editor]);

  const handleBlockTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!editor) return;
    const selected = e.target.value;
    setBlockType(selected);
    if (selected === 'paragraph') {
      editor.chain().focus().setParagraph().run();
    } else if (selected.startsWith('heading-')) {
      const level = Number(selected.split('-')[1]) as 1|2|3|4|5|6;
      editor.chain().focus().setHeading({ level }).run();
    } else if (selected === 'restricted') {
      // Get the current selection and extract content
      const { state } = editor;
      const { selection } = state;
      const selectedContent = selection.empty 
        ? [{ type: 'paragraph', content: [{ type: 'text', text: 'Restricted content here' }] }]
        : state.doc.slice(selection.from, selection.to).content.toJSON();
      
      // Insert a new restricted block with the selected content or default content
      editor.chain().focus().insertContent({
        type: 'restrictedBlock',
        attrs: {
          usergroups: JSON.stringify(pageEditGroups && pageEditGroups.length > 0 ? pageEditGroups : ['public']),
          title: 'Restricted Block',
        },
        content: selectedContent,
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
    const { state } = editor;
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
    const pos = selection.from;
    let node = state.doc.nodeAt(pos);
    if (!node || node.type.name !== 'image') {
      // Try to find an image node in the selection range
      let found = false;
      state.doc.nodesBetween(selection.from, selection.to, (n) => {
        if (n.type.name === 'image' && !found) {
          node = n;
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
  // Add type for currentImageAttrs
  let imageNode: { attrs?: { width?: string; align?: string } } = {};
  if (isImageSelected) {
    const { state } = editor;
    const { selection } = state;
    const node = state.doc.nodeAt(selection.from);
    if (node && node.type.name === 'image') {
      imageNode = node as { attrs?: { width?: string; align?: string } };
    }
  }
  const currentImageAttrs = imageNode.attrs || {};

  return (
    <div className={styles.editorRoot}>
      {/* Toolbar pinned below the main navbar, right of sidebar */}
      <nav className={styles.toolbar}>
        <select
          value={blockType}
          onChange={handleBlockTypeChange}
          className={styles.toolbarSelect}
        >
          {blockOptions.map(opt =>
            opt.value === 'heading' ? (
              <option key={`heading-${opt.level}`} value={`heading-${opt.level}`}>{opt.label}</option>
            ) : (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            )
          )}
        </select>
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run()} className={`${styles.toolbarButton} ${styles.toolbarButtonBold} ${editor.isActive('bold') ? styles.toolbarButtonActive : ''}`}>B</button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run()} className={`${styles.toolbarButton} ${styles.toolbarButtonItalic} ${editor.isActive('italic') ? styles.toolbarButtonActive : ''}`}>I</button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().chain().focus().toggleStrike().run()} className={`${styles.toolbarButton} ${styles.toolbarButtonStrike} ${editor.isActive('strike') ? styles.toolbarButtonActive : ''}`}>S</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} disabled={!editor.can().chain().focus().toggleBulletList().run()} className={styles.toolbarButton}>• List</button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} disabled={!editor.can().chain().focus().toggleOrderedList().run()} className={styles.toolbarButton}>1. List</button>
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className={styles.toolbarButton}>―</button>
        <button type="button" onClick={() => fileInputRef.current?.click()} className={styles.toolbarButton}>Img</button>
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
        }} className={styles.toolbarButton}>Link</button>
        <button type="button" onClick={() => editor.chain().focus().unsetLink().run()} className={styles.toolbarButton}>Unlink</button>
        {/* Image controls: only show if image is selected */}
        {isImageSelected && (
          <div className={styles.imageControls}>
            <label className={styles.imageAlignLabel}>Width:</label>
            <input
              type="range"
              min="50"
              max="800"
              value={parseInt(currentImageAttrs.width || '300', 10)}
              onChange={e => setImageWidth(e.target.value + 'px')}
              className={styles.imageWidthRange}
            />
            <input
              type="number"
              min="50"
              max="800"
              value={parseInt(currentImageAttrs.width || '300', 10)}
              onChange={e => setImageWidth(e.target.value + 'px')}
              className={styles.imageWidthInput}
            />
            <label className={styles.imageAlignLabel}>Align:</label>
            <button type="button" onClick={() => setImageAlign('left')} className={`${styles.toolbarButton} ${currentImageAttrs.align === 'left' ? styles.toolbarButtonActive : ''}`}>Left</button>
            <button type="button" onClick={() => setImageAlign('center')} className={`${styles.toolbarButton} ${currentImageAttrs.align === 'center' ? styles.toolbarButtonActive : ''}`}>Center</button>
            <button type="button" onClick={() => setImageAlign('right')} className={`${styles.toolbarButton} ${currentImageAttrs.align === 'right' ? styles.toolbarButtonActive : ''}`}>Right</button>
          </div>
        )}
      </nav>
      {/* Offset for  toolbar (48px) */}
      <div className={styles.editorOffset}>
        <EditorContent 
          editor={editor} 
          className={`${styles.editorContent} prose prose-invert max-w-none`}
        />
      </div>
    </div>
  );
}
