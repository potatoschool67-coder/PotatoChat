'use client';

import { useState, useEffect, useRef } from 'react';
import Avatar from './Avatar';

interface Member {
  id: string;
  username: string;
  avatar: string | null;
}

interface MentionAutocompleteProps {
  inputValue: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onInsert: (text: string) => void;
  serverId?: string;
}

export default function MentionAutocomplete({ inputValue, inputRef, onInsert, serverId }: MentionAutocompleteProps) {
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState(0);
  const [filter, setFilter] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!serverId) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/servers/${serverId}/members`);
        if (res.ok) {
          const data = await res.json();
          setMembers(data);
        }
      } catch (err) {
        console.error('Failed to fetch members:', err);
      }
      setLoading(false);
    };
    fetchMembers();
  }, [serverId]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const updateCursor = () => {
      setCursorPos(input.selectionStart || 0);
    };

    input.addEventListener('click', updateCursor);
    input.addEventListener('keyup', updateCursor);
    input.addEventListener('keydown', updateCursor);
    return () => {
      input.removeEventListener('click', updateCursor);
      input.removeEventListener('keyup', updateCursor);
      input.removeEventListener('keydown', updateCursor);
    };
  }, [inputRef]);

  useEffect(() => {
    const textBeforeCursor = inputValue.substring(0, cursorPos);
    const lastAt = textBeforeCursor.lastIndexOf('@');
    const lastSpace = textBeforeCursor.lastIndexOf(' ', lastAt);
    const afterAt = lastAt > lastSpace ? textBeforeCursor.substring(lastAt + 1) : '';
    const hasWordAfterAt = !afterAt.includes(' ');

    if (lastAt !== -1 && (lastAt === 0 || textBeforeCursor[lastAt - 1] === ' ') && hasWordAfterAt) {
      setFilter(afterAt);
      setShow(true);
      setSelected(0);
    } else {
      setShow(false);
    }
  }, [inputValue, cursorPos]);

  const allItems = ['@everyone', ...members.map(m => m.username)];
  const filtered = filter 
    ? allItems.filter(name => name.toLowerCase().includes(filter.toLowerCase()))
    : allItems;

  useEffect(() => {
    if (!show || filtered.length === 0) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected(s => (s + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected(s => (s - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelect(filtered[selected]);
      } else if (e.key === 'Escape') {
        setShow(false);
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [show, selected, filtered]);

  const handleSelect = (name: string) => {
    const textBeforeCursor = inputValue.substring(0, cursorPos);
    const lastAt = textBeforeCursor.lastIndexOf('@');
    let before = inputValue.substring(0, lastAt);
    const afterCursor = inputValue.substring(cursorPos);
    
    let insertName = name;
    if (name === '@everyone') {
      insertName = '@everyone';
    } else {
      insertName = `@${name}`;
    }
    
    const newValue = before + insertName + ' ' + afterCursor;
    onInsert(newValue);
    setShow(false);
  };

  if (!show || filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#202225] rounded-lg shadow-lg border border-[#18191c] overflow-hidden z-50">
      <div className="max-h-48 overflow-y-auto">
        {loading ? (
          <div className="px-3 py-2 text-gray-400 text-sm">Loading...</div>
        ) : (
          filtered.map((name, i) => (
            <button
              key={name}
              type="button"
              onClick={() => handleSelect(name)}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[#393c43] ${i === selected ? 'bg-[#393c43]' : ''}`}
            >
              {name === '@everyone' ? (
                <span className="text-[#5865F2] font-medium">@everyone</span>
              ) : (
                <>
                  <Avatar src={members.find(m => m.username === name)?.avatar || null} name={name} size={24} />
                  <span className="text-white font-medium">@{name}</span>
                </>
              )}
            </button>
          ))
        )}
      </div>
      <div className="text-xs text-gray-500 px-3 py-1 border-t border-[#18191c]">
        ↑↓ Navigate • Enter Select • Esc Close
      </div>
    </div>
  );
}