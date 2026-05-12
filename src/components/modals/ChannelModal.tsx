'use client';

import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface ChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChannel: (name: string) => Promise<void>;
}

export default function ChannelModal({ isOpen, onClose, onCreateChannel }: ChannelModalProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await onCreateChannel(input);
      setInput('');
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