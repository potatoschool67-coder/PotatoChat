'use client';

import React, { useState, useEffect } from 'react';
import { X, Image, Lock, Globe } from 'lucide-react';

interface ServerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: { id: string; name: string; icon?: string | null; isPrivate?: boolean } | null;
  onUpdate: (newName: string, newIcon: string) => void;
}

export default function ServerSettingsModal({ isOpen, onClose, server, onUpdate }: ServerSettingsModalProps) {
  const [name, setName] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen && server) {
      setName(server.name || '');
      setIconUrl(server.icon || '');
      setError('');
      setSuccess('');
    }
  }, [isOpen, server]);

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
    } catch (err) {
      setError('Something went wrong');
    }

    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#2b2d31] w-[440px] rounded-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f22]">
          <h2 className="text-lg font-semibold text-white">Server Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

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
                    } catch (err) {
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
      </div>
    </div>
  );
}