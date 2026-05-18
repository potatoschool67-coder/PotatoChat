'use client';

import { X } from 'lucide-react';

interface ReplyPreviewProps {
  username: string;
  content: string;
  onCancel: () => void;
}

export default function ReplyPreview({ username, content, onCancel }: ReplyPreviewProps) {
  const snippet = content.length > 80 ? content.slice(0, 80) + '...' : content;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-[#2B2D31] border-l-4 border-[#5865F2] rounded-t-lg">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-[#5865F2]">Replying to @{username}</span>
        <p className="text-xs text-gray-400 truncate">{snippet}</p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="text-gray-400 hover:text-white flex-shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
}
