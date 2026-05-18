'use client';

import { decodeMessage } from '@/lib/messageEncoding';

interface RepliedToBarProps {
  username: string;
  content: string;
  isEncrypted: boolean;
  replyToId: string;
}

export default function RepliedToBar({ username, content, isEncrypted, replyToId }: RepliedToBarProps) {
  const rawContent = isEncrypted ? decodeMessage(content) : content;
  const snippet = rawContent.length > 80 ? rawContent.slice(0, 80) + '...' : rawContent;

  const handleClick = () => {
    const el = document.getElementById('msg-' + replyToId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-[#5865F2]', 'rounded-lg');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-[#5865F2]', 'rounded-lg');
      }, 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-start gap-2 mb-1 hover:bg-[#2B2D31]/50 rounded px-1 -ml-1 transition-colors group w-full text-left"
    >
      <div className="w-0.5 h-full min-h-[20px] bg-[#4E5058] flex-shrink-0 mt-0.5 group-hover:bg-[#5865F2] transition-colors" />
      <div className="min-w-0">
        <span className="text-xs font-semibold text-[#5865F2]">@{username}</span>
        <p className="text-xs text-gray-400 truncate">{snippet}</p>
      </div>
    </button>
  );
}
