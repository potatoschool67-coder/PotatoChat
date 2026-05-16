'use client';

import React, { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';

interface Member {
  id: string;
  username: string;
  avatar?: string | null;
}

interface ChannelPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelId: string;
  channelName: string;
  isPrivate: boolean;
  currentAllowedIds: string[];
  members: Member[];
  currentUserId: string;
  onUpdated: () => void;
}

export default function ChannelPermissionsModal({
  isOpen,
  onClose,
  channelId,
  channelName,
  isPrivate,
  currentAllowedIds,
  members,
  currentUserId,
  onUpdated,
}: ChannelPermissionsModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(currentAllowedIds));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/channels/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, allowedUserIds: Array.from(selectedIds) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update permissions');
      }
      onUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const otherMembers = members.filter(m => m.id !== currentUserId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-[#313338] rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-[#2B2D31]">
          <h2 className="text-xl font-bold text-white">Channel Permissions</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-[#3F4147] text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div>
            <p className="text-sm text-gray-300 font-medium mb-1">#{channelName}</p>
            {isPrivate ? (
              <p className="text-xs text-gray-500">Select members who can access this private channel</p>
            ) : (
              <p className="text-xs text-gray-500">This is a public channel — everyone can see it</p>
            )}
          </div>

          {isPrivate ? (
            <>
              <div className="max-h-[300px] overflow-y-auto space-y-1 bg-[#1E1F22] rounded-lg p-2">
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

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="flex justify-end gap-3 mt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded font-medium transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save
                </button>
              </div>
            </>
          ) : (
            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
