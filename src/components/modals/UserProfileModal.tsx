'use client';

import React, { useEffect, useState } from 'react';
import { X, User, Loader2, Save, Pencil } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
}

interface ProfileData {
  id: string;
  username: string;
  avatar?: string | null;
  bio?: string | null;
}

export default function UserProfileModal({ userId, onClose }: UserProfileModalProps) {
  const { user: currentUser, refreshUser } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bio, setBio] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const isOwn = currentUser?.id === userId;

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`/api/users/${userId}`);
        if (!res.ok) throw new Error('User not found');
        const data = await res.json();
        setProfile(data);
        setBio(data.bio || '');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [userId]);

  const handleSaveBio = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/users/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio: bio.trim() || null }),
      });
      if (!res.ok) throw new Error('Failed to save');
      await refreshUser();
      onClose();
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-[#2B2D31] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-[#1E1F22]" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 size={32} className="animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : profile ? (
          <>
            <div className="h-[60px] bg-gradient-to-br from-[#5865F2] to-[#4752C4]" />
            <div className="px-4 pb-4">
              <div className="flex justify-between items-start -mt-10 mb-3">
                <div className="w-[80px] h-[80px] rounded-full border-4 border-[#2B2D31] overflow-hidden bg-[#1E1F22] flex items-center justify-center">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={32} className="text-gray-500" />
                  )}
                </div>
                <div className="flex gap-1">
                  {isOwn && !editing && (
                    <button
                      onClick={() => setEditing(true)}
                      className="p-2 rounded-lg hover:bg-[#3F4147] text-gray-400 hover:text-white transition-colors"
                      title="Edit bio"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-[#3F4147] text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <h2 className="text-xl font-bold text-white mb-0.5">{profile.username}</h2>
              <p className="text-xs text-gray-500 mb-4">User ID: {profile.id.slice(0, 8)}...</p>

              <div className="bg-[#1E1F22] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">About Me</h3>
                </div>
                {editing ? (
                  <div className="space-y-2">
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={3}
                      className="w-full p-2.5 bg-[#2B2D31] text-white rounded outline-none focus:ring-2 focus:ring-[#5865F2] text-sm resize-none"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setBio(profile.bio || ''); setEditing(false); }}
                        className="px-3 py-1.5 text-sm text-gray-300 hover:text-white rounded"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveBio}
                        disabled={saving}
                        className="px-3 py-1.5 text-sm bg-[#5865F2] hover:bg-[#4752C4] text-white rounded font-medium transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        Save
                      </button>
                    </div>
                  </div>
                ) : profile.bio ? (
                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{profile.bio}</p>
                ) : (
                  <p className="text-sm text-gray-500 italic">No bio set</p>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
