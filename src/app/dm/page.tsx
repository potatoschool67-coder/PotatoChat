'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, ArrowLeft, Search, Plus, X, Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/utils/Avatar';
import SettingsModal from '@/components/modals/SettingsModal';
import UserProfileModal from '@/components/modals/UserProfileModal';

interface Conversation {
  userId: string;
  username: string;
  avatar: string | null;
  lastMessage: string;
  lastMessageAt: string;
}

interface User {
  id: string;
  username: string;
  avatar?: string | null;
}

export default function DMHomePage() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addUserSearch, setAddUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState<{type: string; from: string; preview: string; time: string}[]>([]);
  const [unreadDMs, setUnreadDMs] = useState<Record<string, boolean>>({});
  const [lastReadDMs, setLastReadDMs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;

    async function fetchConversations() {
      try {
        const res = await fetch('/api/messages/conversations');
        if (res.ok) {
          const data = await res.json();
          setConversations(data);
          
          // Check for unread DMs
          const savedLastRead = localStorage.getItem('lastReadDMs');
          const lastRead = savedLastRead ? JSON.parse(savedLastRead) : {};
          const unread: Record<string, boolean> = {};
          
          for (const conv of data) {
            if (conv.lastMessageAt && lastRead[conv.userId]) {
              if (new Date(conv.lastMessageAt) > new Date(lastRead[conv.userId])) {
                unread[conv.userId] = true;
              }
            } else if (conv.lastMessageAt && !lastRead[conv.userId]) {
              unread[conv.userId] = true;
            }
          }
          setUnreadDMs(unread);
          setLastReadDMs(lastRead);
          const totalUnread = Object.keys(unread).length;
          localStorage.setItem('dmUnreadCount', String(totalUnread));
        }
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
      }
    }

fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [user]);

  // Poll to update unread counts
  useEffect(() => {
    if (!user) return;

    const updateUnreadCount = () => {
      const savedLastRead = localStorage.getItem('lastReadDMs');
      const lastRead = savedLastRead ? JSON.parse(savedLastRead) : {};
      const unread = Object.keys(unreadDMs).filter(uid => {
        if (lastRead[uid]) {
          const conv = conversations.find(c => c.userId === uid);
          if (conv && conv.lastMessageAt) {
            return new Date(conv.lastMessageAt) > new Date(lastRead[uid]);
          }
        }
        return false;
      });
      localStorage.setItem('dmUnreadCount', String(unread.length));
    };

    const interval = setInterval(updateUnreadCount, 5000);
    return () => clearInterval(interval);
  }, [user, unreadDMs, conversations]);

  useEffect(() => {
    if (!addUserSearch.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(addUserSearch)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.filter((u: User) => u.id !== user?.id));
        }
      } catch (err) {
        console.error('Failed to search users:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [addUserSearch, user]);

  // Mark DM as read only when clicking inside the conversation list (not the welcome area)
  useEffect(() => {
    const handleMarkRead = (e: MouseEvent) => {
      if (conversations.length === 0) return;
      
      const target = e.target as HTMLElement;
      // Only mark as read if clicking on a conversation button in the list
      const conversationButton = target.closest('button[class*="rounded"][class*="hover:bg"]');
      
      if (conversationButton) {
        // Get which conversation was clicked
        const buttonText = conversationButton.textContent || '';
        // Mark only conversations as read that were clicked
        const clickedConv = conversations.find(c => 
          buttonText.includes(c.username)
        );
        
        const now = new Date().toISOString();
        const savedLastRead = localStorage.getItem('lastReadDMs');
        const lastRead = savedLastRead ? JSON.parse(savedLastRead) : {};
        
        // Only mark the clicked conversation as read
        if (clickedConv) {
          lastRead[clickedConv.userId] = now;
        }
        
        localStorage.setItem('lastReadDMs', JSON.stringify(lastRead));
        // Recalculate unread count
        const newUnread: Record<string, boolean> = {};
        conversations.forEach(conv => {
          if (lastRead[conv.userId]) {
            if (conv.lastMessageAt && new Date(conv.lastMessageAt) > new Date(lastRead[conv.userId])) {
              newUnread[conv.userId] = true;
            }
          }
        });
        setUnreadDMs(newUnread);
        localStorage.setItem('dmUnreadCount', String(Object.keys(newUnread).length));
      }
    };

    document.addEventListener('click', handleMarkRead);
    return () => document.removeEventListener('click', handleMarkRead);
  }, [conversations]);

  const handleStartConversation = async (userId: string) => {
    router.push(`/dm/${userId}`);
    setIsAddModalOpen(false);
    setAddUserSearch('');
    setSearchResults([]);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full">
      <div className="w-80 bg-[#2B2D31] flex flex-col border-r border-[#1E1F22]">
        <div className="h-12 px-4 flex items-center justify-between shadow-sm border-b border-[#1E1F22] font-bold">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => router.push('/')}
              className="text-gray-400 hover:text-white p-1"
              title="Back to servers"
            >
              <ArrowLeft size={18} />
            </button>
            <span>Messages</span>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="text-gray-400 hover:text-white p-1"
            title="New conversation"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="p-3 border-b border-[#1E1F22]">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1E1F22] text-white text-sm rounded px-8 py-1.5 outline-none focus:ring-1 ring-[#5865F2]"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-xs font-semibold text-gray-400 uppercase mb-2 px-2">Private Messages</div>
          <div className="flex flex-col gap-1">
            {filteredConversations.map((conv) => (
              <button
                key={conv.userId}
                onClick={() => router.push(`/dm/${conv.userId}`)}
                className="flex items-center gap-3 px-2 py-2 rounded hover:bg-[#34373C] transition-colors text-left relative"
              >
                <div className="relative">
                  <Avatar src={conv.avatar} name={conv.username} size={40} />
                  {unreadDMs[conv.userId] && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#2B2D31]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{conv.username}</div>
                  <div className="text-xs text-gray-400 truncate">{conv.lastMessage}</div>
                </div>
              </button>
            ))}
            {conversations.length === 0 && (
              <div className="text-center py-8">
                <MessageSquare size={40} className="mx-auto text-gray-500 mb-2" />
                <p className="text-gray-400 text-sm">No conversations yet</p>
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="text-[#5865F2] hover:underline text-sm mt-2"
                >
                  Start a new conversation
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-3 bg-[#232428] flex items-center gap-2 relative border-t border-[#1E1F22]">
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="hover:opacity-80 transition-opacity"
          >
            <Avatar src={user?.avatar} name={user?.username} size={32} />
          </button>
          <div className="flex flex-col text-xs flex-1">
            <span className="font-bold">{user?.username || 'Guest'}</span>
            <span className="text-gray-400">#0001</span>
          </div>
          {showUserMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-2 mx-2 bg-[#2B2D31] rounded shadow-lg border border-[#1E1F22] overflow-hidden">
              <button
                onClick={() => { setProfileUserId(user?.id || null); setShowUserMenu(false); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-[#3F4147] flex items-center gap-2 text-gray-300"
              >
                <User size={14} /> Profile
              </button>
              <button 
                onClick={() => { setIsSettingsModalOpen(true); setShowUserMenu(false); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-[#3F4147] flex items-center gap-2 text-gray-300"
              >
                <Settings size={14} /> Settings
              </button>
              <button 
                onClick={() => { logout(); setShowUserMenu(false); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-[#3F4147] flex items-center gap-2 text-gray-300"
              >
                <LogOut size={14} /> Log Out
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-[#313338]">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#2B2D31] rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={32} className="text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Welcome to your DMs</h2>
          <p className="text-gray-400 max-w-sm">Select a conversation from the sidebar to start chatting, or click the + button to start a new conversation.</p>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#313338] rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-4 border-b border-[#2B2D31]">
              <h2 className="text-xl font-bold text-white">New Direct Message</h2>
              <button 
                onClick={() => { setIsAddModalOpen(false); setAddUserSearch(''); setSearchResults([]); }} 
                className="p-1 rounded-md hover:bg-[#3F4147] text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  autoFocus
                  className="w-full p-2 pl-10 bg-[#1E1F22] text-white rounded outline-none focus:ring-2 ring-indigo-500 transition-all"
                  value={addUserSearch}
                  onChange={(e) => setAddUserSearch(e.target.value)}
                  placeholder="Search for users..."
                />
              </div>

              {isSearching && <p className="text-gray-400 text-sm mt-4">Searching...</p>}

              <div className="mt-4 max-h-60 overflow-y-auto">
                {searchResults.length > 0 ? (
                  searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleStartConversation(user.id)}
                      className="w-full flex items-center gap-3 p-2 hover:bg-[#3F4147] rounded transition-colors"
                    >
                      <Avatar src={user.avatar} name={user.username} size={32} />
                      <span className="text-white">{user.username}</span>
                    </button>
                  ))
                ) : addUserSearch.trim() && !isSearching ? (
                  <p className="text-gray-400 text-sm">No users found</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onUpdate={refreshUser}
      />

      {profileUserId && (
        <UserProfileModal
          userId={profileUserId}
          onClose={() => setProfileUserId(null)}
        />
      )}
    </div>
  );
}