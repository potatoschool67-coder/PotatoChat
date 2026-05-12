'use client';

import React, { useState } from 'react';
import { X, User, Trash2, Image, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function SettingsModal({ isOpen, onClose, onUpdate }: SettingsModalProps) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'theme'>('profile');
  const [username, setUsername] = useState(user?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [theme, setTheme] = useState(user?.theme || 'dark');

  if (!isOpen) return null;

  const handleUpdateUsername = async () => {
    if (!username.trim() || username === user?.username) return;
    
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/users/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update username');
      }

      setSuccess('Username updated!');
      onUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAvatar = async () => {
    if (avatarUrl === user?.avatar) return;
    
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/users/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: avatarUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update avatar');
      }

      setSuccess('Avatar updated!');
      onUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
    if (!confirm('This will permanently delete all your data including messages and servers. Continue?')) return;

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/users/delete', {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      logout();
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#313338] rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-[#2B2D31]">
          <h2 className="text-xl font-bold text-white">User Settings</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-[#3F4147] text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-[#2B2D31]">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'profile' 
                ? 'text-white border-b-2 border-[#5865F2]' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('theme')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'theme' 
                ? 'text-white border-b-2 border-[#5865F2]' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Theme
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'account' 
                ? 'text-white border-b-2 border-[#5865F2]' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Account
          </button>
        </div>

        <div className="p-4">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Avatar</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-500 rounded-full flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User size={32} />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="Enter image URL..."
                      className="w-full p-2 bg-[#1E1F22] text-white rounded outline-none focus:ring-2 ring-indigo-500 text-sm"
                    />
                    <button
                      onClick={handleUpdateAvatar}
                      disabled={isLoading || avatarUrl === user?.avatar}
                      className="mt-2 px-3 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Image size={14} />}
                      Save Avatar
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="flex-1 p-2 bg-[#1E1F22] text-white rounded outline-none focus:ring-2 ring-indigo-500"
                  />
                  <button
                    onClick={handleUpdateUsername}
                    disabled={isLoading || username === user?.username || !username.trim()}
                    className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded font-medium transition-all disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#2B2D31] rounded-lg">
                <h3 className="text-white font-medium mb-2">Danger Zone</h3>
                <p className="text-gray-400 text-sm mb-3">Once you delete your account, there is no going back.</p>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Theme</label>
                <div className="grid grid-cols-3 gap-3">
                  {['dark', 'light', 'normal'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        theme === t 
                          ? 'border-[#5865F2] bg-[#5865F2]' 
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className={`w-full h-12 rounded mb-2 ${
                        t === 'dark' ? 'bg-[#313338]' : t === 'light' ? 'bg-gray-200' : 'bg-gradient-to-r from-[#313338] to-gray-200'
                      }`} />
                      <span className="text-sm capitalize text-white">{t}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={async () => {
                    setIsLoading(true);
                    try {
                      await fetch('/api/users/update', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ theme }),
                      });
                      setSuccess('Theme updated!');
                      onUpdate();
                    } catch (err: any) {
                      setError(err.message);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading || theme === user?.theme}
                  className="mt-4 px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded font-medium transition-all disabled:opacity-50"
                >
                  Save Theme
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          {success && <p className="text-green-500 text-sm mt-2">{success}</p>}
        </div>
      </div>
    </div>
  );
}