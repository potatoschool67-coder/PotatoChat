'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface Command {
  name: string;
  description: string;
}

const SERVER_COMMANDS: Command[] = [
  { name: '/potatobot', description: 'Add PotatoBot to server' },
  { name: '/potatobot remove', description: 'Remove PotatoBot' },
  { name: '/clear', description: 'Clear messages' },
  { name: '/help', description: 'Show help' },
];

const DM_COMMANDS: Command[] = [
  { name: '/clear', description: 'Clear messages' },
  { name: '/help', description: 'Show help' },
];

const ADMIN_COMMANDS: Command[] = [
  { name: '/ping', description: 'Check bot status' },
  { name: '/potatobot', description: 'Control PotatoBot' },
  { name: '/potatobot start', description: 'Start Ollama' },
  { name: '/potatobot stop', description: 'Stop Ollama' },
  { name: '/loginuser', description: 'Login as user' },
  { name: '/servers', description: 'List servers' },
  { name: '/users', description: 'List users' },
  { name: '/clear', description: 'Clear messages' },
  { name: '/ban', description: 'Ban user' },
  { name: '/unban', description: 'Unban user' },
  { name: '/userdelete', description: 'Delete user' },
  { name: '/serverdelete', description: 'Delete server' },
  { name: '/dmuser', description: 'Send DM' },
  { name: '/ownerbadge on', description: 'Enable owner badge' },
  { name: '/ownerbadge off', description: 'Disable owner badge' },
  { name: '/help', description: 'Show help' },
];

const ADMIN_USER_ID = 'cmoxzael80000f8cvy27jn08b';

export default function CommandAutocomplete({ onSelect, userId }: { onSelect?: (cmd: string) => void; userId?: string }) {
  const pathname = usePathname();
  const isDM = pathname?.startsWith('/dm');
  
  let COMMANDS = SERVER_COMMANDS;
  if (isDM) {
    const isAdminUser = userId === ADMIN_USER_ID;
    COMMANDS = isAdminUser ? ADMIN_COMMANDS : DM_COMMANDS;
  }
  
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState(0);
  const [filter, setFilter] = useState('');

  const filtered = filter 
    ? COMMANDS.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()))
    : COMMANDS;

  useEffect(() => {
    const inputs = document.querySelectorAll('input');
    const input = inputs[inputs.length - 1] as HTMLInputElement;
    
    const checkInput = () => {
      if (!input) return;
      const val = input.value;
      setFilter(val);
      setShow(val.startsWith('/'));
      if (!val.startsWith('/')) setSelected(0);
    };

    document.addEventListener('input', checkInput);
    return () => document.removeEventListener('input', checkInput);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!show || filtered.length === 0) return;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected(s => (s + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected(s => (s - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applyCommand(filtered[selected]);
      } else if (e.key === 'Escape') {
        setShow(false);
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [show, selected, filtered]);

  const applyCommand = (cmd: Command) => {
    if (!cmd || !cmd.name) return;
    
    if (onSelect) {
      onSelect(cmd.name + ' ');
    } else {
      const inputs = document.querySelectorAll('input');
      const input = inputs[inputs.length - 1] as HTMLInputElement;
      if (input) {
        input.value = cmd.name + ' ';
        input.focus();
      }
    }
    setShow(false);
  };

  if (!show || filtered.length === 0) return <div className="absolute bottom-full left-0 right-0 pointer-events-none" />;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#202225] rounded-lg shadow-lg border border-[#18191c] overflow-hidden z-50">
      <div className="max-h-48 overflow-y-auto">
        {filtered.map((cmd, i) => (
          <button
            key={cmd.name}
            type="button"
            onClick={() => applyCommand(cmd)}
            className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#393c43] ${i === selected ? 'bg-[#393c43]' : ''}`}
          >
            <span className="text-white font-medium">{cmd.name}</span>
            <span className="text-gray-400 text-sm">{cmd.description}</span>
          </button>
        ))}
      </div>
      <div className="text-xs text-gray-500 px-3 py-1 border-t border-[#18191c]">
        ↑↓ Navigate • Enter Select • Esc Close
      </div>
    </div>
  );
}