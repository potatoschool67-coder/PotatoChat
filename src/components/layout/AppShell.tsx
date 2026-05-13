'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ServerModal from '@/components/modals/ServerModal';
import ChannelModal from '@/components/modals/ChannelModal';
import SettingsModal from '@/components/modals/SettingsModal';
import ServerSettingsModal from '@/components/modals/ServerSettingsModal';
import Avatar from '@/components/utils/Avatar';
import { Plus, Trash2, LogOut, ArrowLeft, Settings, Cog, Home, MoreHorizontal, Pencil, X, Bell } from 'lucide-react';

interface Server {
  id: string;
  name: string;
  icon?: string | null;
}

interface Channel {
  id: string;
  name: string;
}

interface User {
  id: string;
  username: string;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [servers, setServers] = useState<Server[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeServer, setActiveServer] = useState<Server | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false);
  const [serverChannels, setServerChannels] = useState<Record<string, Channel[]>>({});
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [members, setMembers] = useState<{id: string; username: string; avatar: string | null; status?: string}[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<{type: string; from: string; preview: string; time: string}[]>([]);
  const [draggedServer, setDraggedServer] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [ownerBadgeUser, setOwnerBadgeUser] = useState<string>('');
  const [channelMenuOpen, setChannelMenuOpen] = useState<string | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameChannelId, setRenameChannelId] = useState<string | null>(null);
  const [renameChannelName, setRenameChannelName] = useState('');
  const [serverNotifications, setServerNotifications] = useState<Record<string, number>>({});
  const [dmNotifications, setDmNotifications] = useState<Record<string, number>>({});
  const [unreadChannels, setUnreadChannels] = useState<Record<string, boolean>>({});
  const [dmUnreadCount, setDmUnreadCount] = useState(0);

  useEffect(() => {
    setMounted(true);
    // Get owner badge from localStorage
    const savedBadge = localStorage.getItem('ownerBadge');
    setOwnerBadgeUser(savedBadge || '');
  }, []);

  const handleDragStart = (e: React.DragEvent, serverId: string) => {
    setDraggedServer(serverId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetServerId: string) => {
    e.preventDefault();
    if (!draggedServer || draggedServer === targetServerId) return;

    const draggedIdx = servers.findIndex(s => s.id === draggedServer);
    const targetIdx = servers.findIndex(s => s.id === targetServerId);
    if (draggedIdx === -1 || targetIdx === -1) return;

    const newServers = [...servers];
    const [removed] = newServers.splice(draggedIdx, 1);
    newServers.splice(targetIdx, 0, removed);
    setServers(newServers);
    setDraggedServer(null);
    
    // Save new order to localStorage
    if (mounted) {
      const orderMap: Record<string, number> = {};
      newServers.forEach((s, i) => { orderMap[s.id] = i; });
      localStorage.setItem('serverOrder', JSON.stringify(orderMap));
    }
  };

  useEffect(() => {
    if (user?.theme) {
      document.body.className = user.theme;
    }
  }, [user?.theme]);

  useEffect(() => {
    if (!user) return;

    async function fetchServers() {
      try {
        const res = await fetch('/api/servers/me');
        if (res.ok) {
          let data = await res.json();
          
          // Apply saved order from localStorage (after mount to avoid hydration mismatch)
          if (mounted) {
            const savedOrder = localStorage.getItem('serverOrder');
            if (savedOrder) {
              const orderMap = JSON.parse(savedOrder);
              data = [...data].sort((a: Server, b: Server) => {
                const aIdx = orderMap[a.id] ?? 999;
                const bIdx = orderMap[b.id] ?? 999;
                return aIdx - bIdx;
              });
            }
          }
          
          setServers(data);
          
          const channelMap: Record<string, Channel[]> = {};
          for (const server of data) {
            const chanRes = await fetch(`/api/channels?serverId=${server.id}`);
            if (chanRes.ok) {
              const chanData = await chanRes.json();
              channelMap[server.id] = chanData;
            }
          }
          setServerChannels(channelMap);
          
          // Restore selected server from localStorage
          if (!isLoaded) {
            const savedServerId = localStorage.getItem('activeServerId');
            if (savedServerId) {
              const savedServer = data.find((s: Server) => s.id === savedServerId);
              if (savedServer) {
                setActiveServer(savedServer);
              }
            }
            setIsLoaded(true);
          }
        }
      } catch (err) {
        console.error('Failed to fetch servers:', err);
      }
    }

    fetchServers();
    const interval = setInterval(fetchServers, 5000);
    return () => clearInterval(interval);
  }, [user]);

  // Fetch notifications for servers and DMs
  useEffect(() => {
    if (!user) return;

    async function fetchNotifications() {
      try {
        // Fetch DM notifications from localStorage (set by dm page or dm/[userId] page)
        const savedDmUnread = localStorage.getItem('dmUnreadCount');
        setDmUnreadCount(savedDmUnread ? parseInt(savedDmUnread) : 0);
        
        // Also check for unread DMs by reading lastReadDMs
        const savedLastRead = localStorage.getItem('lastReadDMs');
        const lastRead = savedLastRead ? JSON.parse(savedLastRead) : {};
        
        const dmRes = await fetch('/api/messages/conversations');
        if (dmRes.ok) {
          const conversations = await dmRes.json();
          const dmNotifs: Record<string, number> = {};
          let unreadCount = 0;
          
          for (const conv of conversations) {
            // Don't count own user as having unread
            if (conv.userId === user?.id) continue;
            
            if (conv.lastMessageAt) {
              if (lastRead[conv.userId]) {
                if (new Date(conv.lastMessageAt) > new Date(lastRead[conv.userId])) {
                  dmNotifs[conv.userId] = 1;
                  unreadCount++;
                }
              } else if (!lastRead[conv.userId]) {
                dmNotifs[conv.userId] = 1;
                unreadCount++;
              }
            }
          }
          setDmNotifications(dmNotifs);
          setDmUnreadCount(unreadCount);
          localStorage.setItem('dmUnreadCount', String(unreadCount));
        }

        // Fetch channel notifications for each server
        const newServerNotifs: Record<string, number> = {};
        const newUnreadChannels: Record<string, boolean> = {};
        
        for (const server of servers) {
          const channels = serverChannels[server.id] || [];
          let serverUnread = 0;
          for (const channel of channels) {
            const lastRead = localStorage.getItem(`lastRead_${channel.id}`);
            const msgRes = await fetch(`/api/messages?channelId=${channel.id}`);
            if (msgRes.ok) {
              const messages = await msgRes.json();
              const unread = messages.filter((m: any) => 
                (!lastRead || new Date(m.createdAt) > new Date(lastRead)) && user && m.userId !== user.id
              ).length;
              if (unread > 0) {
                newUnreadChannels[channel.id] = true;
                serverUnread += unread;
              }
            }
          }
          if (serverUnread > 0) {
            newServerNotifs[server.id] = serverUnread;
          }
        }
        setUnreadChannels(newUnreadChannels);
        setServerNotifications(newServerNotifs);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    }

    fetchNotifications();
    const notifInterval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(notifInterval);
  }, [user, servers, serverChannels, mounted]);

  // Mark channel notifications as read only when clicking inside the chat area
  useEffect(() => {
    if (!user) return;
    
    const markRead = (e: MouseEvent) => {
      const match = pathname?.match(/\/server\/[^/]+\/channel\/([^/]+)/);
      if (match) {
        // Only mark as read if clicking inside the main chat area (not sidebar, not channel list)
        const target = e.target as HTMLElement;
        const isInChatArea = target.closest('.flex-1.bg-\\[\\#313338\\]') || 
                            target.closest('main') ||
                            target.closest('[class*="flex-col"][class*="overflow-y-auto"]');
        const isInSidebar = target.closest('.w-60');
        
        if (isInChatArea && !isInSidebar) {
          const channelId = match[1];
          localStorage.setItem(`lastRead_${channelId}`, new Date().toISOString());
          setUnreadChannels(prev => {
            const updated = { ...prev };
            delete updated[channelId];
            return updated;
          });
        }
      }
    };

    document.addEventListener('click', markRead);
    return () => document.removeEventListener('click', markRead);
  }, [pathname, user]);

  // Save activeServer to localStorage when it changes
  useEffect(() => {
    if (activeServer) {
      localStorage.setItem('activeServerId', activeServer.id);
    }
  }, [activeServer]);

  useEffect(() => {
    if (!user) return;
    
    // Update status to online periodically
    const updateStatus = () => {
      fetch('/api/users/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'online' }),
      }).catch(() => {});
    };
    updateStatus();
    const interval = setInterval(updateStatus, 30000);
    
    // Detect when tab becomes hidden (user switches tabs or minimizes)
    const handleVisibility = async () => {
      if (document.visibilityState === 'hidden') {
        // User left the tab - set to offline
        try {
          await fetch('/api/users/status', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'offline' }),
          });
        } catch (e) {}
      } else if (document.visibilityState === 'visible') {
        // User came back - set to online
        try {
          await fetch('/api/users/status', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'online' }),
          });
        } catch (e) {}
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    
    // Also set offline on beforeunload (closing tab/browser)
    window.addEventListener('beforeunload', () => {
      navigator.sendBeacon('/api/users/status', JSON.stringify({ status: 'offline' }));
    });
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user]);

  useEffect(() => {
    if (!activeServer) return;

    const serverId = activeServer.id;

    async function fetchChannels() {
      try {
        const res = await fetch(`/api/channels?serverId=${serverId}`);
        if (res.ok) {
          const data = await res.json();
          setChannels(data);
        }
      } catch (err) {
        console.error('Failed to fetch channels:', err);
      }
    }

    fetchChannels();
    
    // Fetch members
    if (activeServer) {
      fetch(`/api/servers/${activeServer.id}/members`)
        .then(res => res.ok ? res.json() : [])
        .then(memData => setMembers(memData))
        .catch(err => console.error('Failed to fetch members:', err));
    } else {
      setMembers([]);
    }
  }, [activeServer]);

  const handleCreateServer = async (name: string) => {
    const res = await fetch('/api/servers/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Failed to create server');
    const server = await res.json();
    setServers([...servers, server]);
    
    const chanRes = await fetch(`/api/channels?serverId=${server.id}`);
    if (chanRes.ok) {
      const chanData = await chanRes.json();
      setServerChannels({ ...serverChannels, [server.id]: chanData });
      if (chanData.length > 0) {
        router.push(`/server/${server.id}/channel/${chanData[0].id}`);
      }
    }
  };

  const handleJoinServer = async (serverName: string) => {
    const res = await fetch('/api/servers/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverName }),
    });
    if (!res.ok) throw new Error('Server not found');
    const data = await res.json();
    const server = data.server;
    if (!servers.find(s => s.id === server.id)) {
      setServers([...servers, server]);
    }
    const chanRes = await fetch(`/api/channels?serverId=${server.id}`);
    if (chanRes.ok) {
      const chanData = await chanRes.json();
      setServerChannels({ ...serverChannels, [server.id]: chanData });
      if (chanData.length > 0) {
        router.push(`/server/${server.id}/channel/${chanData[0].id}`);
      }
    }
  };

  const handleDeleteServer = async () => {
    if (!activeServer) return;
    if (!confirm(`Are you sure you want to delete "${activeServer.name}"?`)) return;
    
    try {
      const res = await fetch(`/api/servers/${activeServer.id}/delete`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete server');
      }
      
      const newServers = servers.filter(s => s.id !== activeServer.id);
      setServers(newServers);
      const newChannels = { ...serverChannels };
      delete newChannels[activeServer.id];
      setServerChannels(newChannels);
      setActiveServer(null);
      router.push('/');
    } catch (err: any) {
      alert(err.message || 'Failed to delete server');
    }
  };

  const handleCreateChannel = async (name: string) => {
    if (!activeServer) return;
    const res = await fetch('/api/channels/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, serverId: activeServer.id }),
    });
    if (!res.ok) throw new Error('Failed to create channel');
    const channel = await res.json();
    const updatedChannels = [...channels, channel];
    setChannels(updatedChannels);
    setServerChannels({ ...serverChannels, [activeServer.id]: updatedChannels });
    router.push(`/server/${activeServer.id}/channel/${channel.id}`);
  };

  const handleUpdateServer = async (id: string, name: string, icon: string | null) => {
    const res = await fetch(`/api/servers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, icon }),
    });
    if (!res.ok) throw new Error('Failed to update server');
    const updatedServer = await res.json();
    setServers(servers.map(s => s.id === id ? updatedServer : s));
  };

  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm('Delete this channel?')) return;
    const res = await fetch(`/api/channels?channelId=${channelId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const updatedChannels = channels.filter(c => c.id !== channelId);
      setChannels(updatedChannels);
      if (activeServer) {
        setServerChannels({ ...serverChannels, [activeServer.id]: updatedChannels });
      }
      setChannelMenuOpen(null);
      if (updatedChannels.length > 0) {
        router.push(`/server/${activeServer?.id}/channel/${updatedChannels[0].id}`);
      }
    }
  };

  const handleRenameChannel = async () => {
    if (!renameChannelId || !renameChannelName.trim()) return;
    const res = await fetch(`/api/channels?channelId=${renameChannelId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: renameChannelName.trim() }),
    });
    if (res.ok) {
      const updated = await res.json();
      const updatedChannels = channels.map(c => c.id === renameChannelId ? updated : c);
      setChannels(updatedChannels);
      if (activeServer) {
        setServerChannels({ ...serverChannels, [activeServer.id]: updatedChannels });
      }
    }
    setIsRenameModalOpen(false);
    setRenameChannelId(null);
  };

  const getFirstChannelId = (serverId: string) => {
    const chans = serverChannels[serverId];
    return chans?.[0]?.id || '';
  };

  return (
    <div className="flex h-screen w-full bg-[#313338] text-white overflow-hidden">
      {/* Server Sidebar - Always show when logged in */}
      {user && (
        <div className="w-[72px] bg-[#1E1F22] flex flex-col items-center py-3 gap-2">
          <div className="relative">
            <Link 
              href="/dm"
              className="w-12 h-12 bg-[#5865F2] rounded-[24px] flex items-center justify-center cursor-pointer hover:rounded-[16px] transition-all duration-200"
            >
              <span className="text-xl font-bold">P</span>
            </Link>
            {dmUnreadCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center transform translate-x-0.15 -translate-y-0.15">
                {dmUnreadCount > 9 ? '9+' : dmUnreadCount}
              </span>
            )}
          </div>
          <div className="w-8 h-[2px] bg-[#35363C] rounded-full" />

          <div className="flex flex-col gap-2 overflow-y-auto">
            {servers.map((server) => {
              const firstChannelId = getFirstChannelId(server.id);
              const notifCount = serverNotifications[server.id] || 0;
              return (
                <div key={server.id} className="relative">
                  <Link
                    href={firstChannelId ? `/server/${server.id}/channel/${firstChannelId}` : '#'}
                    onClick={() => setActiveServer(server)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, server.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, server.id)}
                    className={`w-12 h-12 rounded-[24px] transition-all duration-200 cursor-pointer flex items-center justify-center overflow-hidden ${
                      activeServer?.id === server.id ? 'bg-[#5865F2] rounded-[16px]' : 'bg-[#313338] hover:rounded-[16px] hover:bg-[#5865F2]'
                    } ${draggedServer === server.id ? 'opacity-50' : ''}`}
                  >
                    {server.icon ? (
                      <img src={server.icon} alt="" className="w-full h-full object-cover" />
                    ) : (
                      server.name.charAt(0).toUpperCase()
                    )}
                  </Link>
                  {notifCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center transform translate-x-0.15 -translate-y-0.15">
                      {notifCount > 9 ? '9+' : notifCount}
                    </span>
                  )}
                </div>
              );
            })}
            <button
              onClick={() => setIsServerModalOpen(true)}
              className="w-12 h-12 rounded-[24px] bg-[#313338] hover:rounded-[16px] hover:bg-[#23A559] transition-all duration-200 cursor-pointer flex items-center justify-center text-[#23A559] hover:text-white"
            >
              <Plus size={24} />
            </button>
          </div>

          <Link
            href="/"
            className="w-12 h-12 rounded-[24px] bg-[#313338] hover:rounded-[16px] hover:bg-[#5865F2] transition-all duration-200 cursor-pointer flex items-center justify-center text-gray-400 hover:text-white mt-2"
            title="Home"
          >
            <Home size={24} />
          </Link>
        </div>
      )}

      <ServerModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        onCreateServer={handleCreateServer}
        onJoinServer={handleJoinServer}
      />

      <ChannelModal
        isOpen={isChannelModalOpen}
        onClose={() => setIsChannelModalOpen(false)}
        onCreateChannel={handleCreateChannel}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onUpdate={refreshUser}
      />

      <ServerSettingsModal
        isOpen={isServerSettingsOpen}
        onClose={() => setIsServerSettingsOpen(false)}
        server={activeServer}
        onUpdate={(newName, newIcon) => {
          setActiveServer({ ...activeServer!, name: newName, icon: newIcon });
          setServers(servers.map(s => s.id === activeServer?.id ? { ...s, name: newName, icon: newIcon } : s));
        }}
      />

      {/* Rename Channel Modal */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[#313338] rounded-lg p-6 w-80">
            <h3 className="text-lg font-bold mb-4">Rename Channel</h3>
            <input
              type="text"
              value={renameChannelName}
              onChange={(e) => setRenameChannelName(e.target.value)}
              className="w-full p-2 bg-[#1E1F22] rounded text-white outline-none focus:ring-2 ring-[#5865F2]"
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setIsRenameModalOpen(false)}
                className="flex-1 py-2 bg-[#4F545C] rounded hover:bg-[#5D6269] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameChannel}
                className="flex-1 py-2 bg-[#5865F2] rounded hover:bg-[#4752C4] transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

{/* Channel Sidebar - Show only on server routes */}
      {user && pathname?.startsWith('/server') && (
        <div className="w-60 bg-[#2B2D31] flex flex-col">
          <div className="h-12 px-4 flex items-center justify-between shadow-sm border-b border-[#1E1F22] font-bold">
            {activeServer ? (
              <div className="flex items-center gap-2">
                {activeServer.icon ? (
                  <img src={activeServer.icon} alt="" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-[#5865F2] flex items-center justify-center text-xs">
                    {activeServer.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span>{activeServer.name}</span>
                <button 
                  onClick={() => setIsServerSettingsOpen(true)}
                  className="text-gray-400 hover:text-white p-1"
                  title="Server settings"
                >
                  <Cog size={16} />
                </button>
                <button 
                  onClick={handleDeleteServer}
                  className="text-gray-400 hover:text-red-500 p-1"
                  title="Delete server"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white flex items-center gap-2">
                <ArrowLeft size={18} />
                <span>Back to Servers</span>
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase mb-2">
              <span>Text Channels</span>
              {activeServer && (
                <button 
                  onClick={() => setIsChannelModalOpen(true)}
                  className="hover:text-white transition-colors"
                  title="Create channel"
                >
                  <Plus size={14} />
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1">
              {channels.map((channel) => (
                <div key={channel.id} className="group relative flex items-center">
                  {unreadChannels[channel.id] && (
                    <div className="absolute -left-2 top-0 bottom-0 w-1 bg-red-500 rounded-full" />
                  )}
                  <Link
                    href={`/server/${activeServer?.id}/channel/${channel.id}`}
                    className="flex-1 px-2 py-1 rounded hover:bg-[#3F4147] cursor-pointer text-gray-300 hover:text-white flex items-center gap-2"
                  >
                    <span className="text-gray-500">#</span> {channel.name}
                    {unreadChannels[channel.id] && (
                      <span className="ml-auto w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </Link>
                  <button
                    onClick={() => setChannelMenuOpen(channelMenuOpen === channel.id ? null : channel.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#3F4147] rounded text-gray-400 hover:text-white"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                  {channelMenuOpen === channel.id && (
                    <div className="absolute left-0 top-full mt-1 bg-[#2B2D31] rounded shadow-lg border border-[#1E1F22] overflow-hidden z-50 min-w-[120px]">
                      <button
                        onClick={() => { setRenameChannelId(channel.id); setRenameChannelName(channel.name); setIsRenameModalOpen(true); setChannelMenuOpen(null); }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-[#3F4147] flex items-center gap-2 text-gray-300"
                      >
                        <Pencil size={12} /> Rename
                      </button>
                      <button
                        onClick={() => handleDeleteChannel(channel.id)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-[#3F4147] flex items-center gap-2 text-red-400"
                      >
                        <X size={12} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="p-3 bg-[#232428] flex items-center gap-2 relative">
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
      )}

      {/* Main Chat Area */}
      <main className="flex-1 flex bg-[#313338]">
        <div className="flex-1 flex flex-col">
          {children}
        </div>
        
        {/* Members Sidebar - show on server routes */}
        {user && activeServer && pathname?.startsWith('/server') && (
          <div className="w-60 bg-[#2B2D31] flex flex-col py-4">
            <div className="px-4 mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase">Members - {members.length}</h3>
            </div>
            <div className="flex-1 overflow-y-auto px-2">
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-[#34373F] cursor-pointer">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="relative">
                      {member.avatar ? (
                        <img src={member.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-sm font-bold">
                          {member.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#2B2D31] ${member.status === 'online' ? 'bg-[#23A559]' : 'bg-gray-400'}`} />
                    </div>
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-sm text-gray-300 truncate">{member.username}</span>
                      {member.username.toLowerCase() === ownerBadgeUser.toLowerCase() && (
                        <span className="text-xs bg-[#FEE500] text-black px-1 rounded font-bold">Owner</span>
                      )}
                    </div>
                  </div>
                  {user?.username?.toLowerCase() === 'hi' && member.username.toLowerCase() !== 'hi' && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={async () => {
                          if (!confirm(`Kick ${member.username} from server?`)) return;
                          const res = await fetch(`/api/servers/${activeServer?.id}/members`, {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: member.id }),
                          });
                          if (res.ok) {
                            setMembers(members.filter(m => m.id !== member.id));
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-yellow-400"
                        title="Kick"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`DELETE USER "${member.username}"? This cannot be undone!`)) return;
                          const res = await fetch(`/api/users/${member.id}`, { method: 'DELETE' });
                          if (res.ok) {
                            setMembers(members.filter(m => m.id !== member.id));
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-red-500"
                        title="Delete User"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v4m0-4v4m0 4v4m0-4v4m0-4v4a2 2 0 01-2 2H8a2 2 0 01-2-2V7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
