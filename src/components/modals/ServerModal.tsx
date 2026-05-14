'use client';

import React, { useState } from 'react';
import { X, Plus, LogIn, ChevronDown, ChevronRight, Lock } from 'lucide-react';

interface Server {
  id: string;
  name: string;
  icon?: string | null;
}

interface ServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateServer: (name: string, isPrivate: boolean, password: string) => Promise<void>;
  onJoinServer: (serverName: string, password?: string) => Promise<void>;
  editServer?: Server | null;
  onUpdateServer?: (id: string, name: string, icon: string | null) => Promise<void>;
}

export default function ServerModal({ isOpen, onClose, onCreateServer, onJoinServer, editServer, onUpdateServer }: ServerModalProps) {
  const [view, setView] = useState<'create' | 'join' | 'edit'>('create');
  const [input, setInput] = useState('');
  const [iconInput, setIconInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showExtraSettings, setShowExtraSettings] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [joinPassword, setJoinPassword] = useState('');

  React.useEffect(() => {
    if (editServer) {
      setView('edit');
      setInput(editServer.name || '');
      setIconInput(editServer.icon || '');
    } else {
      setView('create');
      setInput('');
      setIconInput('');
      setShowExtraSettings(false);
      setIsPrivate(false);
      setPassword('');
      setJoinPassword('');
    }
  }, [editServer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Only use password if server is private
    const finalPassword = isPrivate ? password : '';

    try {
      if (view === 'create') {
        await onCreateServer(input, isPrivate, finalPassword);
      } else if (view === 'join') {
        await onJoinServer(input, joinPassword || undefined);
      } else if (view === 'edit' && editServer && onUpdateServer) {
        await onUpdateServer(editServer.id, input, iconInput || null);
      }
      setInput('');
      setIconInput('');
      setPassword('');
      setJoinPassword('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#313338] rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-[#2B2D31]">
          <h2 className="text-xl font-bold text-white">
            {view === 'create' ? 'Create a Server' : view === 'join' ? 'Join a Server' : 'Server Settings'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-[#3F4147] text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {view === 'edit' && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Server Icon URL</label>
              <input
                className="p-2 bg-[#1E1F22] text-white rounded outline-none focus:ring-2 ring-indigo-500 transition-all"
                value={iconInput}
                onChange={(e) => setIconInput(e.target.value)}
                placeholder="Enter image URL..."
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase">
              {view === 'create' ? 'Server Name' : view === 'join' ? 'Server Name' : 'Server Name'}
            </label>
            <input
              autoFocus
              className="p-2 bg-[#1E1F22] text-white rounded outline-none focus:ring-2 ring-indigo-500 transition-all"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={view === 'create' ? "Enter server name..." : view === 'join' ? "Enter server name to join..." : "Enter server name..."}
              required
            />
          </div>

          {view === 'join' && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Password (if required)</label>
              <input
                type="password"
                className="p-2 bg-[#1E1F22] text-white rounded outline-none focus:ring-2 ring-indigo-500 transition-all"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                placeholder="Enter server password..."
              />
            </div>
          )}

          {view === 'create' && (
            <div className="border border-[#1E1F22] rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() => setShowExtraSettings(!showExtraSettings)}
                className="w-full flex items-center justify-between p-3 bg-[#2B2D31] hover:bg-[#35373C] transition-colors text-gray-300"
              >
                <span className="text-sm font-medium">Extra Settings</span>
                {showExtraSettings ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {showExtraSettings && (
                <div className="p-4 bg-[#2B2D31] border-t border-[#1E1F22] space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isPrivate"
                      checked={isPrivate}
                      onChange={(e) => { setIsPrivate(e.target.checked); if (!e.target.checked) setPassword(''); }}
                      className="w-4 h-4 rounded bg-[#1E1F22] border-gray-600 text-indigo-500 focus:ring-indigo-500"
                    />
                    <label htmlFor="isPrivate" className="text-sm text-gray-300 flex items-center gap-2">
                      <Lock size={14} /> Make this server private
                    </label>
                  </div>
                  {isPrivate && (
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-gray-400 uppercase">Password</label>
                      <input
                        type="password"
                        className="p-2 bg-[#1E1F22] text-white rounded outline-none focus:ring-2 ring-indigo-500 transition-all"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password to join..."
                        required={isPrivate}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex justify-end gap-3 mt-4">
            {view === 'edit' ? (
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded font-medium transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => { setView(view === 'create' ? 'join' : 'create'); setError(''); setShowExtraSettings(false); setIsPrivate(false); setPassword(''); setJoinPassword(''); }}
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  {view === 'create' ? 'Join instead' : 'Create instead'}
                </button>
                <button
                  disabled={isLoading}
                  className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded font-medium transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? 'Processing...' : (view === 'create' ? <><Plus size={18} /> Create</> : <><LogIn size={18} /> Join</>)}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
