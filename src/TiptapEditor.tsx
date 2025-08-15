import React from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TipTapLink from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import RestrictedBlock from './RestrictedBlock';
import RestrictedBlockPlaceholder from './RestrictedBlockPlaceholder';
import TextAlign from '@tiptap/extension-text-align';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import { FontSize, FontWeight } from './FontExtensions';
import { useUser } from "./userContext";
import styles from './Editor.module.css';
import { MermaidNode } from './MermaidExtension';
import LinkSearchModal from './components/search/LinkSearchModal';

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
  
  // Link modal state
  const [showLinkModal, setShowLinkModal] = React.useState(false);
  const [showLinkSearchModal, setShowLinkSearchModal] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState('');
  const [linkText, setLinkText] = React.useState('');
  const [isEditingLink, setIsEditingLink] = React.useState(false);
  
  // Only set initial content on first mount
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      TextStyle, // Required for font extensions
      FontFamily.configure({
        types: ['textStyle'],
      }),
      FontSize.configure({
        types: ['textStyle'],
      }),
      FontWeight.configure({
        types: ['textStyle'],
      }),
      ResizableImage,
      TipTapLink.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'wiki-link',
        },
      }),
      Placeholder.configure({ placeholder: 'Start typing your wiki content...' }),
      RestrictedBlock,
      RestrictedBlockPlaceholder,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      MermaidNode, // Include Mermaid extension
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

  // Handle keyboard events for link modal
  React.useEffect(() => {
    if (!showLinkModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLinkModal();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        applyLink();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showLinkModal, linkUrl, linkText, isEditingLink]);

  // Dropdown for block type selection
  const [blockType, setBlockType] = React.useState('paragraph');
  const blockOptions: Array<{ label: string; value: string; level?: number; disabled?: boolean }> = [
    { label: 'Mixed/Multiple', value: '', disabled: true },
    { label: 'Paragraph', value: 'paragraph' },
    { label: 'Heading 1', value: 'heading', level: 1 },
    { label: 'Heading 2', value: 'heading', level: 2 },
    { label: 'Heading 3', value: 'heading', level: 3 },
    { label: 'Heading 4', value: 'heading', level: 4 },
    { label: 'Heading 5', value: 'heading', level: 5 },
    { label: 'Heading 6', value: 'heading', level: 6 },
    { label: 'Restricted Block', value: 'restricted' },
    { label: 'Mermaid Diagram', value: 'mermaid' },
  ];

  // Update blockType state to reflect current selection in the editor
  React.useEffect(() => {
    if (!editor) return;

    const updateBlockType = () => {
      const { state } = editor;
      const { selection } = state;
      const { $from, $to } = selection;
      
      // If selection spans multiple positions, check for consistent formatting
      if (!selection.empty) {
        const blockTypes = new Set<string>();
        
        // Check each position in the selection for block type
        state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
          if (node.isBlock) {
            if (node.type.name === 'heading') {
              blockTypes.add(`heading-${node.attrs.level}`);
            } else if (node.type.name === 'paragraph') {
              blockTypes.add('paragraph');
            } else if (node.type.name === 'restrictedBlock') {
              blockTypes.add('restricted');
            } else if (node.type.name === 'mermaid') {
              blockTypes.add('mermaid');
            }
          }
        });
        
        // If multiple different block types are selected, show empty/mixed state
        if (blockTypes.size > 1) {
          setBlockType('');
          return;
        } else if (blockTypes.size === 1) {
          setBlockType(Array.from(blockTypes)[0]);
          return;
        }
      }
      
      // Single cursor position or empty selection
      const parent = $from.node($from.depth);
      if (parent.type.name === 'heading') {
        setBlockType(`heading-${parent.attrs.level}`);
      } else if (parent.type.name === 'paragraph') {
        setBlockType('paragraph');
      } else if (parent.type.name === 'restrictedBlock') {
        setBlockType('restricted');
      } else if (parent.type.name === 'mermaid') {
        setBlockType('mermaid');
      } else {
        setBlockType('paragraph'); // fallback
      }
    };

    // Update immediately
    updateBlockType();

    // Listen for selection changes
    const handleSelectionUpdate = () => {
      updateBlockType();
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    editor.on('transaction', handleSelectionUpdate);

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
      editor.off('transaction', handleSelectionUpdate);
    };
  }, [editor]);

  const handleBlockTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!editor) return;
    const selected = e.target.value;
    
    // If empty value is selected (Mixed/Multiple), do nothing
    if (selected === '') {
      return;
    }
    
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
          usergroups: JSON.stringify(user?.username ? [user.username] : ['admin']),
          editgroups: JSON.stringify(user?.username ? [user.username] : ['admin']), // Default to current user's username
          title: 'Restricted Block',
        },
        content: selectedContent,
      }).run();
      setBlockType('paragraph');
    } else if (selected === 'mermaid') {
      // Insert a new Mermaid diagram
      editor.chain().focus().insertMermaid({
        code: 'graph TD\n    A[Start] --> B[Process]\n    B --> C[End]'
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

  // Link modal functions
  function openLinkModal() {
    const { state } = editor!;
    const { selection } = state;
    const selectedText = state.doc.textBetween(selection.from, selection.to);
    
    // Check if we're editing an existing link
    const linkAttrs = editor!.getAttributes('link');
    if (linkAttrs.href) {
      setIsEditingLink(true);
      setLinkUrl(linkAttrs.href);
      setLinkText(selectedText || 'Link text');
    } else {
      setIsEditingLink(false);
      setLinkUrl('');
      setLinkText(selectedText || '');
    }
    
    setShowLinkModal(true);
  }

  function openLinkSearchModal() {
    const { state } = editor!;
    const { selection } = state;
    const selectedText = state.doc.textBetween(selection.from, selection.to);
    
    setLinkText(selectedText);
    setShowLinkSearchModal(true);
  }

  function closeLinkModal() {
    setShowLinkModal(false);
    setLinkUrl('');
    setLinkText('');
    setIsEditingLink(false);
  }

  function closeLinkSearchModal() {
    setShowLinkSearchModal(false);
    setLinkText('');
  }

  function handlePageSelect(page: any) {
    if (!editor) return;
    
    const { state } = editor;
    const { selection } = state;
    const hasSelection = !selection.empty;
    const displayText = linkText.trim() || page.title;
    const pageUrl = `/pages/${page.id}`;
    
    if (hasSelection) {
      // Update selection with link
      editor.chain().focus().toggleLink({ href: pageUrl }).run();
    } else {
      // Insert new link with page title as text
      editor.chain().focus().insertContent(`<a href="${pageUrl}">${displayText}</a>`).run();
    }
    
    closeLinkSearchModal();
  }

  function applyLink() {
    if (!editor) return;
    
    if (!linkUrl.trim()) {
      closeLinkModal();
      return;
    }
    
    const { state } = editor;
    const { selection } = state;
    const hasSelection = !selection.empty;
    
    if (isEditingLink || hasSelection) {
      // Update existing link or create link from selection
      editor.chain().focus().toggleLink({ href: linkUrl.trim() }).run();
    } else if (linkText.trim()) {
      // Insert new link with text
      editor.chain().focus().insertContent(`<a href="${linkUrl.trim()}">${linkText.trim()}</a>`).run();
    } else {
      // Insert URL as both href and text
      editor.chain().focus().insertContent(`<a href="${linkUrl.trim()}">${linkUrl.trim()}</a>`).run();
    }
    
    closeLinkModal();
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
              <option key={`heading-${opt.level}`} value={`heading-${opt.level}`} disabled={opt.disabled}>{opt.label}</option>
            ) : (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
            )
          )}
        </select>
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run()} className={`${styles.toolbarButton} ${styles.toolbarButtonBold} ${editor.isActive('bold') ? styles.toolbarButtonActive : ''}`}>B</button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run()} className={`${styles.toolbarButton} ${styles.toolbarButtonItalic} ${editor.isActive('italic') ? styles.toolbarButtonActive : ''}`}>I</button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().chain().focus().toggleStrike().run()} className={`${styles.toolbarButton} ${styles.toolbarButtonStrike} ${editor.isActive('strike') ? styles.toolbarButtonActive : ''}`}>S</button>
        
        {/* Font Family Selector */}
        <select
          value={editor.getAttributes('textStyle').fontFamily || ''}
          onChange={(e) => {
            if (e.target.value === '') {
              editor.chain().focus().unsetFontFamily().run();
            } else {
              editor.chain().focus().setFontFamily(e.target.value).run();
            }
          }}
          className={styles.toolbarSelect}
        >
          <option value="">Default Font</option>
          <option value="Arial, sans-serif">Arial</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="Times New Roman, serif">Times New Roman</option>
          <option value="Helvetica, sans-serif">Helvetica</option>
          <option value="Courier New, monospace">Courier New</option>
          <option value="Verdana, sans-serif">Verdana</option>
          <option value="Trebuchet MS, sans-serif">Trebuchet MS</option>
        </select>
        
        {/* Font Size Selector */}
        <select
          value={editor.getAttributes('textStyle').fontSize || ''}
          onChange={(e) => {
            if (e.target.value === '') {
              editor.chain().focus().unsetFontSize().run();
            } else {
              editor.chain().focus().setFontSize(e.target.value).run();
            }
          }}
          className={styles.toolbarSelect}
        >
          <option value="">Default Size</option>
          <option value="10px">10px</option>
          <option value="12px">12px</option>
          <option value="14px">14px</option>
          <option value="16px">16px</option>
          <option value="18px">18px</option>
          <option value="20px">20px</option>
          <option value="24px">24px</option>
          <option value="28px">28px</option>
          <option value="32px">32px</option>
          <option value="36px">36px</option>
          <option value="48px">48px</option>
        </select>
        
        {/* Font Weight Selector */}
        <select
          value={editor.getAttributes('textStyle').fontWeight || ''}
          onChange={(e) => {
            if (e.target.value === '') {
              editor.chain().focus().unsetFontWeight().run();
            } else {
              editor.chain().focus().setFontWeight(e.target.value).run();
            }
          }}
          className={styles.toolbarSelect}
        >
          <option value="">Default Weight</option>
          <option value="100">Thin (100)</option>
          <option value="200">Extra Light (200)</option>
          <option value="300">Light (300)</option>
          <option value="400">Normal (400)</option>
          <option value="500">Medium (500)</option>
          <option value="600">Semi Bold (600)</option>
          <option value="700">Bold (700)</option>
          <option value="800">Extra Bold (800)</option>
          <option value="900">Black (900)</option>
        </select>
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
        <button type="button" onClick={openLinkModal} className={styles.toolbarButton}>Link</button>
        <button type="button" onClick={openLinkSearchModal} className={styles.toolbarButton}>Link Page</button>
        <button type="button" onClick={() => editor.chain().focus().unsetLink().run()} className={styles.toolbarButton}>Unlink</button>
        <button type="button" onClick={() => {
          editor.chain().focus().insertMermaid({
            code: 'graph TD\n    A[Start] --> B[Process]\n    B --> C[End]'
          }).run();
        }} className={styles.toolbarButton}>📊 Diagram</button>
        
        {/* Table controls */}
        <div className={styles.tableControls}>
          <button 
            type="button" 
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            className={styles.toolbarButton}
          >
            Table
          </button>
          {editor.isActive('table') && (
            <>
              <button 
                type="button" 
                onClick={() => editor.chain().focus().addColumnBefore().run()}
                className={styles.toolbarButton}
              >
                +Col
              </button>
              <button 
                type="button" 
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                className={styles.toolbarButton}
              >
                Col+
              </button>
              <button 
                type="button" 
                onClick={() => editor.chain().focus().deleteColumn().run()}
                className={styles.toolbarButton}
              >
                Col-
              </button>
              <button 
                type="button" 
                onClick={() => editor.chain().focus().addRowBefore().run()}
                className={styles.toolbarButton}
              >
                Row⁺
              </button>
              <button 
                type="button" 
                onClick={() => editor.chain().focus().addRowAfter().run()}
                className={styles.toolbarButton}
              >
                Row₊
              </button>
              <button 
                type="button" 
                onClick={() => editor.chain().focus().deleteRow().run()}
                className={styles.toolbarButton}
              >
                Row-
              </button>
              <button 
                type="button" 
                onClick={() => editor.chain().focus().toggleHeaderRow().run()}
                className={`${styles.toolbarButton} ${editor.isActive('table') && editor.can().toggleHeaderRow() ? styles.toolbarButtonActive : ''}`}
              >
                Header
              </button>
              <button 
                type="button" 
                onClick={() => editor.chain().focus().deleteTable().run()}
                className={styles.toolbarButton}
              >
                Del Table
              </button>
            </>
          )}
        </div>
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

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 shadow-lg max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">
              {isEditingLink ? 'Edit Link' : 'Add Link'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  URL
                </label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (isEditingLink || !linkText.trim()) {
                        applyLink();
                      } else {
                        // Focus on link text field if it exists and is empty
                        const linkTextInput = e.currentTarget.parentElement?.parentElement?.querySelector('input[placeholder="Link text"]') as HTMLInputElement;
                        if (linkTextInput) {
                          linkTextInput.focus();
                        }
                      }
                    }
                  }}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-600 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              
              {!isEditingLink && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Link Text (optional)
                  </label>
                  <input
                    type="text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyLink();
                      }
                    }}
                    placeholder="Link text"
                    className="w-full px-3 py-2 border border-gray-600 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Leave empty to use the URL as link text
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={applyLink}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {isEditingLink ? 'Update Link' : 'Add Link'}
              </button>
              <button
                onClick={closeLinkModal}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Search Modal */}
      <LinkSearchModal
        isOpen={showLinkSearchModal}
        onClose={closeLinkSearchModal}
        onPageSelect={handlePageSelect}
        initialQuery={linkText}
      />
    </div>
  );
}
