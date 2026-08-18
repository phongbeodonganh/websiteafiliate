import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import type { Editor, Range } from '@tiptap/core';
import {
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Table as TableIcon,
  ImageIcon,
  Tag,
  Minus,
} from 'lucide-react';
import SlashCommandList, { type SlashCommandItem, type SlashCommandListHandle } from './SlashCommandList';

export interface SlashCommandExternalHandlers {
  openImagePicker: () => void;
  openAffiliateModal: () => void;
}

// "Ảnh" và "Affiliate" cần mở file-picker/modal — việc React component ngoài
// RichTextEditor quản lý, không phải lệnh editor thuần tuý — nên trỏ qua object
// mutable này thay vì phải cấu hình lại toàn bộ `useEditor` mỗi khi callback đổi.
export const slashCommandHandlers: SlashCommandExternalHandlers = {
  openImagePicker: () => {},
  openAffiliateModal: () => {},
};

function buildAllItems(): SlashCommandItem[] {
  return [
    {
      title: 'Tiêu đề H2',
      description: 'Tiêu đề phụ cấp 1',
      icon: Heading2,
      run: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
    },
    {
      title: 'Tiêu đề H3',
      description: 'Tiêu đề phụ cấp 2',
      icon: Heading3,
      run: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run(),
    },
    {
      title: 'Danh sách',
      description: 'Danh sách gạch đầu dòng',
      icon: List,
      run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      title: 'Danh sách số',
      description: 'Danh sách đánh số thứ tự',
      icon: ListOrdered,
      run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      title: 'Trích dẫn',
      description: 'Khối trích dẫn',
      icon: Quote,
      run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    },
    {
      title: 'Khối code',
      description: 'Đoạn mã nguồn',
      icon: Code,
      run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    },
    {
      title: 'Bảng',
      description: 'Bảng 3x3 có header',
      icon: TableIcon,
      run: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      title: 'Ảnh',
      description: 'Tải ảnh lên từ máy',
      icon: ImageIcon,
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        slashCommandHandlers.openImagePicker();
      },
    },
    {
      title: 'Affiliate',
      description: 'Chèn link/nút affiliate',
      icon: Tag,
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        slashCommandHandlers.openAffiliateModal();
      },
    },
    {
      title: 'Đường kẻ ngang',
      description: 'Phân tách nội dung',
      icon: Minus,
      run: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    },
  ];
}

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        startOfLine: false,
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: SlashCommandItem }) => {
          props.run({ editor, range });
        },
        items: ({ query }: { query: string }) =>
          buildAllItems().filter((item) => item.title.toLowerCase().includes(query.toLowerCase())),
        render: () => {
          let component: ReactRenderer<SlashCommandListHandle>;
          let unmount: (() => void) | undefined;

          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashCommandList, {
                props: { items: props.items, command: props.command },
                editor: props.editor,
              });
              // `mount()` gắn thẳng vào document.body nên vị trí luôn đúng, nhưng
              // không tự có z-index — nếu không set tay, các phần tử khác trong
              // trang admin có z-index cao (modal, header sticky...) sẽ đè lên.
              // Set trước khi mount() gán position: z-index chỉ có tác dụng khi
              // phần tử đã positioned, điều mount() sẽ tự làm ngay sau đây.
              component.element.style.zIndex = '9999';
              unmount = props.mount(component.element);
            },
            onUpdate(props) {
              component.updateProps({ items: props.items, command: props.command });
            },
            onKeyDown(props) {
              if (props.event.key === 'Escape') {
                unmount?.();
                return true;
              }
              return component.ref?.onKeyDown(props) ?? false;
            },
            onExit() {
              unmount?.();
              component.destroy();
            },
          };
        },
      }),
    ];
  },
});
