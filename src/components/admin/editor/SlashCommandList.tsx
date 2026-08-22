'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Editor, Range } from '@tiptap/core';

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: LucideIcon;
  run: (ctx: { editor: Editor; range: Range }) => void;
}

interface SlashCommandListProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export interface SlashCommandListHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const SlashCommandList = forwardRef<SlashCommandListHandle, SlashCommandListProps>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => setSelectedIndex(0), [items]);

  const selectItem = (index: number) => {
    const item = items[index];
    if (item) command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + items.length - 1) % items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % items.length);
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-2 text-xs text-slate-500 w-56">
        Không tìm thấy lệnh nào
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-1 w-64 max-h-72 overflow-y-auto">
      {items.map((item, index) => (
        <button
          key={item.title}
          type="button"
          onClick={() => selectItem(index)}
          className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors ${
            index === selectedIndex ? 'bg-amber-500/15 text-amber-300' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <item.icon size={16} className="mt-0.5 shrink-0" />
          <span>
            <span className="block text-xs font-semibold">{item.title}</span>
            <span className="block text-[10px] text-slate-500">{item.description}</span>
          </span>
        </button>
      ))}
    </div>
  );
});

SlashCommandList.displayName = 'SlashCommandList';

export default SlashCommandList;
