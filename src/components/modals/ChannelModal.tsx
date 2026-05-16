'use client';

import React, { useState } from 'react';
import { X, Plus, Lock, Globe } from 'lucide-react';

interface Member {
  id: string;
  username: string;
  avatar?: string | null;
}

interface ChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChannel: (name: string, isPrivate?: boolean, allowedUserIds?: string[]) => Promise<void>;
  members: Member[];
  currentUserId: string;
}

export default function ChannelModal({ isOpen, onClose, onCreateChannel, members, currentUserId }: ChannelModalProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const toggleMember = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await onCreateChannel(
        input,
        isPrivate || undefined,
        isPrivate ? Array.from(selectedIds) : undefined
      );
      setInput('');
      setIsPrivate(false);
      setSelectedIds(new Set());
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const otherMembers = members.filter(m => m.id !== currentUserId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#313338] rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-[#2B2D31]">
          <h2 className="text-xl font-bold text-white">Create Text Channel</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-[#3F4147] text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Channel Name</label>
            <input
              autoFocus
              className="p-2 bg-[#1E1F22] text-white rounded outline-none focus:ring-2 ring-indigo-500 transition-all"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter channel name..."
              required
            />
          </div>

          <div className="flex items-center gap-3 p-3 bg-[#2B2D31] rounded-lg">
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all ${isPrivate ? 'bg-[#5865F2] text-white' : 'bg-[#1E1F22] text-gray-400'}`}
            >
              {isPrivate ? <Lock size={14} /> : <Globe size={14} />}
              {isPrivate ? 'Private' : 'Public'}
            </button>
            <span className="text-sm text-gray-400">
              {isPrivate ? 'Only selected members can view' : 'Everyone can view'}
            </span>
          </div>

          {isPrivate && (
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Select Members</label>
              <div className="max-h-[200px] overflow-y-auto space-y-1 bg-[#1E1F22] rounded-lg p-2">
                {otherMembers.map(member => (
                  <label
                    key={member.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${selectedIds.has(member.id) ? 'bg-[#5865F2]/20' : 'hover:bg-[#2B2D31]'}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(member.id)}
                      onChange={() => toggleMember(member.id)}
                      className="accent-[#5865F2]"
                    />
                    <div className="w-6 h-6 rounded-full bg-[#5865F2] flex items-center justify-center text-xs font-bold overflow-hidden flex-shrink-0">
                      {member.avatar ? (
                        <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        member.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="text-sm text-gray-300">{member.username}</span>
                  </label>
                ))}
                {otherMembers.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-2">No other members</p>
                )}
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={isLoading}
              className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded font-medium transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? 'Creating...' : <><Plus size={18} /> Create</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
