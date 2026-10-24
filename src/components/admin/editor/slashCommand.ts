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
      title: 'Heading 2',
      description: 'Insert a level 2 heading',
      icon: Heading2,
      run: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
    },
    {
      title: 'Heading 3',
      description: 'Insert a level 3 heading',
      icon: Heading3,
      run: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run(),
    },
    {
      title: 'Bulleted List',
      description: 'Insert a bulleted list',
      icon: List,
      run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      title: 'Numbered List',
      description: 'Insert a numbered list',
      icon: ListOrdered,
      run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      title: 'Block Quote',
      description: 'Insert a block quote',
      icon: Quote,
      run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    },
    {
      title: 'Code Block',
      description: 'Insert a code block',
      icon: Code,
      run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    },
    {
      title: 'Table',
      description: 'Insert a 3 × 3 table with a header row',
      icon: TableIcon,
      run: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      title: 'Image',
      description: 'Upload an image from your device',
      icon: ImageIcon,
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        slashCommandHandlers.openImagePicker();
      },
    },
    {
      title: 'Affiliate',
      description: 'Insert an affiliate link or button',
      icon: Tag,
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        slashCommandHandlers.openAffiliateModal();
      },
    },
    {
      title: 'Horizontal Rule',
      description: 'Insert a horizontal divider',
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
