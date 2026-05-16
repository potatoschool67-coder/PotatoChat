'use client';

import React from 'react';
import { User } from 'lucide-react';

interface UserContextMenuProps {
  userId: string;
  username: string;
  position: { x: number; y: number };
  onViewProfile: (userId: string) => void;
  onClose: () => void;
}

export default function UserContextMenu({ userId, username, position, onViewProfile, onClose }: UserContextMenuProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-[#2B2D31] rounded shadow-lg border border-[#1E1F22] overflow-hidden min-w-[160px]"
        style={{ left: position.x, top: position.y }}
      >
        <div className="px-3 py-2 text-xs text-gray-400 border-b border-[#1E1F22]">
          {username}
        </div>
        <button
          onClick={() => { onViewProfile(userId); onClose(); }}
          className="w-full px-3 py-2 text-left text-sm hover:bg-[#3F4147] flex items-center gap-2 text-gray-300"
        >
          <User size={14} /> Profile
        </button>
      </div>
    </>
  );
}
