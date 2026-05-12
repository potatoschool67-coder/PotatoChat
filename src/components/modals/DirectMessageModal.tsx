'use client';

import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';

interface User {
  id: string;
  username: string;
}

interface DirectMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: User) => void;
}

export default function DirectMessageModal({ isOpen, onClose, onSelectUser }: DirectMessageModalProps) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setUsers([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!search.trim()) {
      setUsers([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(search)}`);
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error('Failed to search users:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#313338] rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-[#2B2D31]">
          <h2 className="text-xl font-bold text-white">Private Messages</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-[#3F4147] text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              autoFocus
              className="w-full p-2 pl-10 bg-[#1E1F22] text-white rounded outline-none focus:ring-2 ring-indigo-500 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for users..."
            />
          </div>

          {loading && <p className="text-gray-400 text-sm mt-4">Searching...</p>}

          <div className="mt-4 max-h-60 overflow-y-auto">
            {users.length > 0 ? (
              users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => { onSelectUser(user); onClose(); }}
                  className="w-full flex items-center gap-3 p-2 hover:bg-[#3F4147] rounded transition-colors"
                >
                  <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white">{user.username}</span>
                </button>
              ))
            ) : search.trim() && !loading ? (
              <p className="text-gray-400 text-sm">No users found</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}