'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { useEffect, useState } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Code2,
  Undo,
  Redo,
} from 'lucide-react';

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export default function TipTapEditor({ content, onChange }: TipTapEditorProps) {
  const [isCodeView, setIsCodeView] = useState(false);
  const [rawHtml, setRawHtml] = useState(content);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3, 4],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-cyan-400 underline font-semibold hover:text-cyan-300',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-xl border border-slate-800 my-4 max-w-full h-auto shadow-md',
        },
      }),
    ],
    content: content,
    editorProps: {
      attributes: {
        class:
          'prose prose-invert max-w-none min-h-[350px] focus:outline-none p-4 text-slate-200 text-sm leading-relaxed custom-editor-content',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setRawHtml(html);
      onChange(html);
    },
  });

  // Keep editor content in sync when external content prop changes (e.g. AI generated content)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
      setRawHtml(content || '');
    }
  }, [content, editor]);

  if (!editor) {
    return <div className="h-64 bg-slate-950 rounded-xl animate-pulse border border-slate-800"></div>;
  }

  const handleSetLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Nhập URL liên kết (href):', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const handleRawHtmlChange = (val: string) => {
    setRawHtml(val);
    onChange(val);
    if (editor) {
      editor.commands.setContent(val);
    }
  };

  return (
    <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 backdrop-blur-md shadow-xl transition-all">
      {/* Editor Toolbar */}
      <div className="bg-slate-900/90 border-b border-slate-800 p-2 flex flex-wrap items-center justify-between gap-1 text-slate-300">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded-lg hover:bg-slate-800 transition-colors ${
              editor.isActive('bold') ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30' : 'text-slate-400'
            }`}
            title="Bold (Ctrl+B)"
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded-lg hover:bg-slate-800 transition-colors ${
              editor.isActive('italic') ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30' : 'text-slate-400'
            }`}
            title="Italic (Ctrl+I)"
          >
            <Italic size={15} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-2 rounded-lg hover:bg-slate-800 transition-colors ${
              editor.isActive('strike') ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30' : 'text-slate-400'
            }`}
            title="Strikethrough"
          >
            <Strikethrough size={15} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-2 rounded-lg hover:bg-slate-800 transition-colors ${
              editor.isActive('code') ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30' : 'text-slate-400'
            }`}
            title="Inline Code"
          >
            <Code size={15} />
          </button>

          <div className="w-px h-5 bg-slate-800 mx-1"></div>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-2 rounded-lg hover:bg-slate-800 transition-colors text-xs font-bold flex items-center gap-1 ${
              editor.isActive('heading', { level: 2 }) ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400'
            }`}
            title="Heading 2 (H2)"
          >
            <Heading2 size={15} /> H2
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-2 rounded-lg hover:bg-slate-800 transition-colors text-xs font-bold flex items-center gap-1 ${
              editor.isActive('heading', { level: 3 }) ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400'
            }`}
            title="Heading 3 (H3)"
          >
            <Heading3 size={15} /> H3
          </button>

          <div className="w-px h-5 bg-slate-800 mx-1"></div>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded-lg hover:bg-slate-800 transition-colors ${
              editor.isActive('bulletList') ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400'
            }`}
            title="Bullet List"
          >
            <List size={15} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded-lg hover:bg-slate-800 transition-colors ${
              editor.isActive('orderedList') ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400'
            }`}
            title="Numbered List"
          >
            <ListOrdered size={15} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-2 rounded-lg hover:bg-slate-800 transition-colors ${
              editor.isActive('blockquote') ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400'
            }`}
            title="Blockquote"
          >
            <Quote size={15} />
          </button>

          <div className="w-px h-5 bg-slate-800 mx-1"></div>

          <button
            type="button"
            onClick={handleSetLink}
            className={`p-2 rounded-lg hover:bg-slate-800 transition-colors ${
              editor.isActive('link') ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400'
            }`}
            title="Insert/Edit Link"
          >
            <LinkIcon size={15} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo"
          >
            <Undo size={15} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            title="Redo"
          >
            <Redo size={15} />
          </button>

          <div className="w-px h-5 bg-slate-800 mx-1"></div>

          <button
            type="button"
            onClick={() => setIsCodeView(!isCodeView)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isCodeView
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Code2 size={14} /> {isCodeView ? 'WYSIWYG Mode' : 'HTML Code Mode'}
          </button>
        </div>
      </div>

      {/* Editor Body */}
      {isCodeView ? (
        <textarea
          rows={16}
          value={rawHtml}
          onChange={(e) => handleRawHtmlChange(e.target.value)}
          className="w-full bg-slate-950 p-4 text-xs text-amber-300 font-mono focus:outline-none leading-relaxed border-none shadow-inner resize-y"
          placeholder="Enter raw HTML content..."
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
}
