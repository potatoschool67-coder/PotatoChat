'use client';

import React, { useState } from 'react';
import { X, Plus, LogIn, Upload } from 'lucide-react';

interface Server {
  id: string;
  name: string;
  icon?: string | null;
}

interface ServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateServer: (name: string) => Promise<void>;
  onJoinServer: (serverName: string) => Promise<void>;
  editServer?: Server | null;
  onUpdateServer?: (id: string, name: string, icon: string | null) => Promise<void>;
}

export default function ServerModal({ isOpen, onClose, onCreateServer, onJoinServer, editServer, onUpdateServer }: ServerModalProps) {
  const [view, setView] = useState<'create' | 'join' | 'edit'>('create');
  const [input, setInput] = useState('');
  const [iconInput, setIconInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (editServer) {
      setView('edit');
      setInput(editServer.name || '');
      setIconInput(editServer.icon || '');
    } else {
      setView('create');
      setInput('');
      setIconInput('');
    }
  }, [editServer]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (view === 'create') {
        await onCreateServer(input);
      } else if (view === 'join') {
        await onJoinServer(input);
      } else if (view === 'edit' && editServer && onUpdateServer) {
        await onUpdateServer(editServer.id, input, iconInput || null);
      }
      setInput('');
      setIconInput('');
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
                  onClick={() => { setView(view === 'create' ? 'join' : 'create'); setError(''); }}
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
