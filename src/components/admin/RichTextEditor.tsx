'use client';

import { useCallback, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Quote,
  Code,
  Link2,
  ImageIcon,
  Table as TableIcon,
  Tag,
  Trash2,
  Columns,
  Rows,
} from 'lucide-react';
import AffiliateInsertModal from './AffiliateInsertModal';

interface AffiliateLinkOption {
  id: string;
  name: string;
  commission?: string;
  cookie?: string;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  articleId?: string;
  affiliateLinks: AffiliateLinkOption[];
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        active ? 'bg-amber-500/20 text-amber-300' : 'text-slate-300 hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({ value, onChange, articleId, affiliateLinks }: RichTextEditorProps) {
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showAffiliateModal, setShowAffiliateModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } },
      }),
      Image,
      Placeholder.configure({ placeholder: 'Viết nội dung bài viết ở đây...' }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-invert prose-sm max-w-none min-h-[280px] focus:outline-none px-4 py-3 [&_table]:w-full [&_td]:border [&_td]:border-slate-700 [&_td]:p-2 [&_th]:border [&_th]:border-slate-700 [&_th]:p-2',
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (files && files.length > 0 && files[0].type.startsWith('image/')) {
          event.preventDefault();
          uploadAndInsertImage(files[0]);
          return true;
        }
        return false;
      },
      handlePaste: (view, event) => {
        const files = event.clipboardData?.files;
        if (files && files.length > 0 && files[0].type.startsWith('image/')) {
          event.preventDefault();
          uploadAndInsertImage(files[0]);
          return true;
        }
        return false;
      },
    },
  });

  const uploadAndInsertImage = useCallback(
    async (file: File) => {
      setIsUploadingImage(true);
      try {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/v1/cms/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const json = await res.json();
        if (res.ok && json.status === 'success') {
          editor?.chain().focus().setImage({ src: json.data.url }).run();
        } else {
          alert(`Lỗi upload: ${json.message || 'Không thể tải ảnh lên'}`);
        }
      } catch {
        alert('Đã có lỗi xảy ra khi tải ảnh lên!');
      } finally {
        setIsUploadingImage(false);
      }
    },
    [editor]
  );

  const handleImageButtonClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAndInsertImage(file);
    e.target.value = '';
  };

  const handleSetLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Nhập URL:', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  if (!editor) return null;

  const isInTable = editor.isActive('table');

  return (
    <div className="border border-slate-800 rounded-xl bg-slate-950 shadow-inner overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-800 bg-slate-900/60 px-2 py-1.5">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Đậm">
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Nghiêng">
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Gạch chân">
          <UnderlineIcon size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Gạch ngang">
          <Strikethrough size={15} />
        </ToolbarButton>

        <div className="w-px h-5 bg-slate-800 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Tiêu đề H2"
        >
          <Heading2 size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Tiêu đề H3"
        >
          <Heading3 size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
          active={editor.isActive('heading', { level: 4 })}
          title="Tiêu đề H4"
        >
          <Heading4 size={15} />
        </ToolbarButton>

        <div className="w-px h-5 bg-slate-800 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Danh sách"
        >
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Danh sách số"
        >
          <ListOrdered size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Trích dẫn"
        >
          <Quote size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          title="Khối code"
        >
          <Code size={15} />
        </ToolbarButton>

        <div className="w-px h-5 bg-slate-800 mx-1" />

        <ToolbarButton onClick={handleSetLink} active={editor.isActive('link')} title="Chèn link">
          <Link2 size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={handleImageButtonClick} disabled={isUploadingImage} title="Chèn ảnh">
          <ImageIcon size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="Chèn bảng"
        >
          <TableIcon size={15} />
        </ToolbarButton>

        {isInTable && (
          <>
            <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} title="Thêm cột">
              <Columns size={15} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} title="Thêm hàng">
              <Rows size={15} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} title="Xóa bảng">
              <Trash2 size={15} />
            </ToolbarButton>
          </>
        )}

        <div className="w-px h-5 bg-slate-800 mx-1" />

        <button
          type="button"
          onClick={() => setShowAffiliateModal(true)}
          title="Chèn Affiliate"
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20"
        >
          <Tag size={13} /> Chèn Affiliate
        </button>

        {isUploadingImage && <span className="text-[10px] text-slate-400 ml-2">Đang tải ảnh lên...</span>}

        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} className="hidden" />
      </div>

      {editor && (
        <BubbleMenu editor={editor} className="flex items-center gap-0.5 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-1">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Đậm">
            <Bold size={14} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Nghiêng">
            <Italic size={14} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Gạch chân">
            <UnderlineIcon size={14} />
          </ToolbarButton>
          <ToolbarButton onClick={handleSetLink} active={editor.isActive('link')} title="Chèn link">
            <Link2 size={14} />
          </ToolbarButton>
        </BubbleMenu>
      )}

      <EditorContent editor={editor} />

      <AffiliateInsertModal
        open={showAffiliateModal}
        onClose={() => setShowAffiliateModal(false)}
        affiliateLinks={affiliateLinks}
        articleId={articleId}
        onInsert={(html) => {
          editor.chain().focus().insertContent(html).run();
        }}
      />
    </div>
  );
}
