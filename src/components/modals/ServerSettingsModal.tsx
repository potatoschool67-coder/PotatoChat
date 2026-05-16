'use client';

import React, { useState, useEffect } from 'react';
import { X, Lock, Globe, Trash2, Shield, Crown } from 'lucide-react';
import Avatar from '@/components/utils/Avatar';

interface MemberInfo {
  id: string;
  username: string;
  avatar: string | null;
  role: string;
}

interface ServerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: { id: string; name: string; icon?: string | null; isPrivate?: boolean } | null;
  onUpdate: (newName: string, newIcon: string) => void;
  isOwner?: boolean;
}

export default function ServerSettingsModal({ isOpen, onClose, server, onUpdate, isOwner }: ServerSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'hierarchy'>('overview');
  const [name, setName] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && server) {
      setName(server.name || '');
      setIconUrl(server.icon || '');
      setError('');
      setSuccess('');
      setActiveTab('overview');
      fetchMembers();
    }
  }, [isOpen, server?.id]);

  const fetchMembers = async () => {
    if (!server) return;
    setMembersLoading(true);
    try {
      const res = await fetch(`/api/servers/${server.id}/members`);
      if (res.ok) {
        setMembers(await res.json());
      }
    } catch {
      // silent
    } finally {
      setMembersLoading(false);
    }
  };

  const owner = members.find((m) => m.role === 'OWNER') || null;
  const adminCount = members.filter((m) => m.role === 'ADMIN').length;
  const guestCount = members.filter((m) => m.role === 'GUEST').length;

  if (!isOpen || !server) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/servers/${server.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || server.name, icon: iconUrl.trim() || null }),
      });

      if (res.ok) {
        setSuccess('Server updated successfully');
        onUpdate(name.trim(), iconUrl.trim());
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update server');
      }
    } catch {
      setError('Something went wrong');
    }

    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#2b2d31] w-[520px] rounded-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f22]">
          <h2 className="text-lg font-semibold text-white">Server Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-[#1f1f22]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 px-4 py-2 text-sm font-medium ${activeTab === 'overview' ? 'text-white border-b-2 border-[#5865F2]' : 'text-gray-400 hover:text-white'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`flex-1 px-4 py-2 text-sm font-medium ${activeTab === 'hierarchy' ? 'text-white border-b-2 border-[#5865F2]' : 'text-gray-400 hover:text-white'}`}
          >
            Hierarchy
          </button>
        </div>

        {activeTab === 'overview' && (
          <form onSubmit={handleSubmit} className="p-4">
            <div className="flex flex-col items-center mb-6">
              <div className="w-20 h-20 rounded-full bg-[#313338] flex items-center justify-center text-2xl font-bold text-gray-400 overflow-hidden mb-3">
                {iconUrl ? (
                  <img src={iconUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  server.name.charAt(0).toUpperCase()
                )}
              </div>
              <input
                type="text"
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
                placeholder="Paste image URL for icon"
                className="mt-2 w-full bg-[#1e1f22] text-gray-200 px-3 py-2 rounded text-sm outline-none border border-[#1e1f22] focus:border-[#5865F2]"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Server Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded outline-none border border-[#1e1f22] focus:border-[#5865F2]"
              />
            </div>

            {server?.isPrivate && (
              <div className="mb-4 p-3 bg-[#1e1f22] rounded border border-[#5865F2]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Lock size={16} className="text-[#5865F2]" />
                    <span className="text-sm">This server is private</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm('Are you sure you want to make this server public? You cannot revert this action.')) return;
                      try {
                        const res = await fetch(`/api/servers/${server.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ makePublic: true }),
                        });
                        if (res.ok) {
                          setSuccess('Server is now public');
                          window.location.reload();
                        } else {
                          const data = await res.json();
                          setError(data.error || 'Failed to make server public');
                        }
                      } catch {
                        setError('Something went wrong');
                      }
                    }}
                    className="px-3 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm rounded flex items-center gap-1"
                  >
                    <Globe size={14} /> Make Public
                  </button>
                </div>
              </div>
            )}

            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            {success && <p className="text-green-400 text-sm mb-3">{success}</p>}

            {isOwner && (
              <div className="mb-4 p-3 bg-[#2B2D31] rounded border border-red-500/30">
                <div className="flex items-center justify-between">
                  <div className="text-gray-300">
                    <p className="text-sm font-medium">Delete Server</p>
                    <p className="text-xs text-gray-400">Permanently delete this server and all its messages</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm(`Are you sure you want to delete "${server.name}"? This cannot be undone.`)) return;
                      try {
                        const res = await fetch(`/api/servers/${server.id}/delete`, {
                          method: 'DELETE',
                        });
                        if (res.ok) {
                          window.location.href = '/';
                        } else {
                          const data = await res.json();
                          setError(data.error || 'Failed to delete server');
                        }
                      } catch {
                        setError('Something went wrong');
                      }
                    }}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded flex items-center gap-1"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-[#5865F2] text-white rounded hover:bg-[#4752C4] disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'hierarchy' && (
          <div className="p-4 space-y-4">
            <p className="text-sm text-gray-400 mb-2">Server roles and permissions hierarchy</p>

            {membersLoading && !owner && (
              <p className="text-sm text-gray-500">Loading...</p>
            )}

            {!membersLoading && !owner && members.length === 0 && (
              <p className="text-sm text-gray-500">No owner found</p>
            )}

            {owner && (
              <div className="bg-[#1e1f22] rounded-lg p-4 border border-[#5865F2]/30">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar src={owner.avatar} name={owner.username} size={44} />
                    <div className="absolute -bottom-1 -right-1 bg-[#5865F2] rounded-full p-0.5">
                      <Crown size={12} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{owner.username}</span>
                      <span className="text-xs bg-[#5865F2]/20 text-[#5865F2] px-2 py-0.5 rounded font-medium">Server Owner</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Has full control over the server</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-[#1e1f22] rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-300 mb-2">
                <Shield size={16} />
                <span className="text-sm font-medium">Roles</span>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between py-1.5 px-2 bg-[#2B2D31] rounded cursor-pointer" onClick={() => setExpandedRole(expandedRole === 'owner' ? null : 'owner')}>
                    <div className="flex items-center gap-2">
                      <Crown size={14} className="text-[#5865F2]" />
                      <span className="text-sm text-white">Owner</span>
                    </div>
                    <span className="text-xs text-[#5865F2] hover:underline">{owner ? '1 member' : '—'}</span>
                  </div>
                  {expandedRole === 'owner' && owner && (
                    <div className="mt-1 ml-6 py-1.5 px-2 flex items-center gap-2">
                      <Avatar src={owner.avatar} name={owner.username} size={20} />
                      <span className="text-sm text-gray-300">{owner.username}</span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between py-1.5 px-2 bg-[#2B2D31] rounded cursor-pointer" onClick={() => setExpandedRole(expandedRole === 'admin' ? null : 'admin')}>
                    <div className="flex items-center gap-2">
                      <Shield size={14} className="text-green-400" />
                      <span className="text-sm text-white">Admin</span>
                    </div>
                    <span className="text-xs text-[#5865F2] hover:underline">{adminCount > 0 ? `${adminCount} ${adminCount === 1 ? 'member' : 'members'}` : '—'}</span>
                  </div>
                  {expandedRole === 'admin' && (
                    <div className="mt-1 space-y-1 max-h-[200px] overflow-y-auto">
                      {members.filter((m) => m.role === 'ADMIN').map((m) => (
                        <div key={m.id} className="ml-6 py-1.5 px-2 flex items-center gap-2">
                          <Avatar src={m.avatar} name={m.username} size={20} />
                          <span className="text-sm text-gray-300">{m.username}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between py-1.5 px-2 bg-[#2B2D31] rounded cursor-pointer" onClick={() => setExpandedRole(expandedRole === 'guest' ? null : 'guest')}>
                    <div className="flex items-center gap-2">
                      <Shield size={14} className="text-gray-500" />
                      <span className="text-sm text-white">Guest</span>
                    </div>
                    <span className="text-xs text-[#5865F2] hover:underline">{guestCount > 0 ? `${guestCount} ${guestCount === 1 ? 'member' : 'members'}` : 'Default'}</span>
                  </div>
                  {expandedRole === 'guest' && (
                    <div className="mt-1 space-y-1 max-h-[200px] overflow-y-auto">
                      {members.filter((m) => m.role === 'GUEST').map((m) => (
                        <div key={m.id} className="ml-6 py-1.5 px-2 flex items-center gap-2">
                          <Avatar src={m.avatar} name={m.username} size={20} />
                          <span className="text-sm text-gray-300">{m.username}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
