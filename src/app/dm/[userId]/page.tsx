'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Send, MessageSquare, ArrowLeft, Trash2, Settings, LogOut, MoreHorizontal, User, Reply } from 'lucide-react';
import Avatar from '@/components/utils/Avatar';
import Linkify from '@/components/utils/Linkify';
import SettingsModal from '@/components/modals/SettingsModal';
import UserContextMenu from '@/components/chat/UserContextMenu';
import UserProfileModal from '@/components/modals/UserProfileModal';
import ReplyPreview from '@/components/chat/ReplyPreview';
import RepliedToBar from '@/components/chat/RepliedToBar';
import CommandAutocomplete from '@/components/utils/CommandAutocomplete';
import { useAuth } from '@/context/AuthContext';
import { ensureAudioContext, unlockAudio } from '@/lib/audio';
import { decodeMessage } from '@/lib/messageEncoding';
import { extractImages, removeImagesFromText } from '@/lib/imageUtils';
import ImagePreview from '@/components/utils/ImagePreview';
import GifImage from '@/components/utils/GifImage';

interface Message {
  id: string;
  content: string;
  isEncrypted?: boolean;
  user: { id: string; username: string; avatar: string | null };
  createdAt: string;
  replyTo?: {
    id: string;
    content: string;
    userId: string;
    user: { username: string };
  } | null;
}

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
  avatar: string | null;
}

export default function DMPage() {
  const { user, logout, refreshUser } = useAuth();
  const params = useParams();
  const router = useRouter();
  const currentUserId = params.userId as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [openMenuMsgId, setOpenMenuMsgId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ userId: string; username: string; x: number; y: number } | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [otherUnreadCount, setOtherUnreadCount] = useState(0);
  const [unreadConversations, setUnreadConversations] = useState<Record<string, boolean>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  }, [input]);
  const [isSending, setIsSending] = useState(false);
  
const handleInputChange = (value: string) => {
    setInput(value);
  };

  const prevMessages = useRef<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageCount = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const playNotificationSound = async () => {
    try {
      const audioCtx = await ensureAudioContext();
      const now = audioCtx.currentTime;
      
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0.1, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.3);
      });
    } catch (e) {
      console.error('Audio error:', e);
    }
  };

  useEffect(() => {
    unlockAudio();
    const handleUnlock = () => {
      unlockAudio();
      document.removeEventListener('click', handleUnlock);
    };
    document.addEventListener('click', handleUnlock);
    return () => document.removeEventListener('click', handleUnlock);
  }, []);

  useEffect(() => {
    if (messages.length > lastMessageCount.current) {
      scrollToBottom();
    }
    lastMessageCount.current = messages.length;
  }, [messages]);

  useEffect(() => {
    async function fetchConversations() {
      try {
        const res = await fetch('/api/messages/conversations');
        if (res.ok) {
          const data = await res.json();
          setConversations(data);
          
          // Check for unread DMs (exclude own messages)
          const savedLastRead = localStorage.getItem('lastReadDMs');
          const lastRead = savedLastRead ? JSON.parse(savedLastRead) : {};
          const unread: Record<string, boolean> = {};
          
          for (const conv of data) {
            if (conv.userId === user?.id) continue;
            
            if (conv.lastMessageAt) {
              if (lastRead[conv.userId]) {
                if (new Date(conv.lastMessageAt) > new Date(lastRead[conv.userId])) {
                  unread[conv.userId] = true;
                }
              } else if (!lastRead[conv.userId]) {
                unread[conv.userId] = true;
              }
            }
          }
          setUnreadConversations(unread);
        }
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
      }
    }
    fetchConversations();
    const convInterval = setInterval(fetchConversations, 5000);
    return () => clearInterval(convInterval);
  }, [user]);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch(`/api/users/${currentUserId}`);
        if (res.ok) {
          const data = await res.json();
          setOtherUser(data);
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    }
    if (currentUserId) {
      fetchUser();
    }
  }, [currentUserId]);

  useEffect(() => {
    prevMessages.current = [];
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;

    fetchMessages();

    let interval = setInterval(fetchMessages, 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchMessages();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentUserId]);

  // Mark only this DM conversation as read when viewing
  useEffect(() => {
    if (currentUserId && user) {
      const savedLastRead = localStorage.getItem('lastReadDMs');
      const lastRead = savedLastRead ? JSON.parse(savedLastRead) : {};
      lastRead[currentUserId] = new Date().toISOString();
      localStorage.setItem('lastReadDMs', JSON.stringify(lastRead));
      localStorage.setItem('dmUnreadCount', '0');
    }
  }, [currentUserId, user]);

  // Fetch other conversations' unread count while in this DM
  useEffect(() => {
    if (!user) return;

    async function checkOtherUnread() {
      try {
        const res = await fetch('/api/messages/conversations');
        if (res.ok) {
          const data = await res.json();
          const savedLastRead = localStorage.getItem('lastReadDMs');
          const lastRead = savedLastRead ? JSON.parse(savedLastRead) : {};
          
          let unread = 0;
          for (const conv of data) {
            if (conv.userId !== currentUserId && conv.lastMessageAt) {
              if (lastRead[conv.userId]) {
                if (new Date(conv.lastMessageAt) > new Date(lastRead[conv.userId])) {
                  unread++;
                }
              } else {
                unread++;
              }
            }
          }
          setOtherUnreadCount(unread);
          localStorage.setItem('dmUnreadCount', String(unread));
        }
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
      }
    }

    checkOtherUnread();
    const interval = setInterval(checkOtherUnread, 5000);
    return () => clearInterval(interval);
  }, [user, currentUserId]);

  async function fetchMessages() {
    try {
      const res = await fetch(`/api/messages/dm?otherUserId=${currentUserId}`);
      if (res.ok) {
        const data = await res.json();
        
        if (prevMessages.current.length > 0) {
          const newMsgIds = data.map((m: Message) => m.id).filter((id: string) => 
            !prevMessages.current.some((m) => m.id === id)
          );
          if (newMsgIds.length > 0) {
            for (const id of newMsgIds) {
              const msg = data.find((m: Message) => m.id === id);
              if (msg && msg.user.id !== user?.id) {
                playNotificationSound();
                break;
              }
            }
          }
        }
        
        prevMessages.current = data;
        setMessages(data);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }

  async function handleSend() {
    const canSend = (input.trim() || imageUrl) && user && !isSending;
    if (!canSend) return;
    
    setIsSending(true);

    const isHi = user?.username?.toLowerCase() === 'hi';

    if (isHi && input.trim().startsWith('/')) {
      const cmd = input.trim().toLowerCase().split(' ')[0];
      
      if (cmd === '/loginuser') {
        setInput('');
        const parts = input.trim().split(' ');
        const args = parts.slice(1).join(' ');
        
        await fetch('/api/admin/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: 'loginuser', userId: user?.id, args }),
        });
        
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
        return;
      }
      
      if (cmd === '/ownerbadge') {
        setInput('');
        const parts = input.trim().split(' ');
        const args = parts.slice(1).join(' ');
        
        if (args === 'on') {
          localStorage.setItem('ownerBadge', 'hi');
          alert('Owner badge enabled');
        } else if (args === 'off') {
          localStorage.setItem('ownerBadge', '');
          alert('Owner badge disabled');
        } else {
          alert('Usage: /ownerbadge on or /ownerbadge off');
        }
        window.location.reload();
        return;
      }
    }

    const isAdmin = otherUser?.username?.toLowerCase() === 'admin';

    if (isAdmin && input.trim().startsWith('/')) {
      const cmd = input.trim().toLowerCase().split(' ')[0];
      
      if (cmd === '/help') {
        alert('Admin Commands:\n/ping - Check bot status\n/servers - List all servers\n/users - List all users\n/ban [username] - Ban a user\n/unban [username] - Unban a user\n/userdelete [username] - Delete a user\n/serverdelete [servername] - Delete a server\n/dmuser [message] [username] - Send DM to user\n/loginuser [username] - Login as user\n/ownerbadge on - Enable owner badge\n/ownerbadge off - Disable owner badge\n/clear - Clear messages\n/help - Show this help');
        setInput('');
        return;
      }

      const parts = input.trim().split(' ');
      const commandName = parts[0].replace('/', '');
      const args = parts.slice(1).join(' ');
      const validCommands = ['ping', 'servers', 'users', 'ban', 'unban', 'userdelete', 'serverdelete', 'dmuser', 'loginuser', 'ownerbadge'];
      
      if (validCommands.includes(commandName)) {
        setInput('');
        const res = await fetch('/api/admin/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: commandName, userId: user?.id, args }),
        });
        
        if (res.ok) {
          const data = await res.json();
          
          if (commandName === 'loginuser' && data.token) {
            document.cookie = `auth-token=${data.token}; path=/; max-age=${60*60*24*7}`;
            window.location.reload();
            return;
          }
          
          if (data.response) alert(data.response);
          
          if (commandName === 'ownerbadge') {
            if (args === 'on') {
              localStorage.setItem('ownerBadge', 'hi');
            } else if (args === 'off') {
              localStorage.setItem('ownerBadge', '');
            }
            window.location.reload();
          }
          fetchMessages();
          return;
        }
      }
    }

    if (input.trim() === '/clear') {
      if (!confirm('Are you sure you want to delete all messages in this conversation?')) {
        setIsSending(false);
        return;
      }
      
      const res = await fetch(`/api/messages/dm?otherUserId=${currentUserId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setMessages([]);
        setInput('');
      } else {
        alert('Failed to clear messages');
      }
      setIsSending(false);
      return;
    }

    if (input.trim() === '/help') {
      alert('Available commands:\n/clear - Delete all messages in this conversation\n/help - Show this help message');
      setInput('');
      setIsSending(false);
      return;
    }

    const messageContent = imageUrl ? `${input} ${imageUrl}`.trim() : input;

    const res = await fetch('/api/messages/dm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: messageContent, recipientId: currentUserId, replyToId: replyingTo?.id || undefined }),
    });

    if (res.ok) {
      setInput('');
      setImageUrl(null);
      setReplyingTo(null);
      fetchMessages();
    }
    setIsSending(false);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    await handleSend();
  }

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Delete this message?')) return;
    
    const res = await fetch(`/api/messages?id=${messageId}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      fetchMessages();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete message');
    }
  };

  async function removeConversation() {
    if (!confirm('Are you sure you want to delete this conversation?')) return;
    
    try {
      const res = await fetch(`/api/messages/conversation/${currentUserId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/dm');
      }
    } catch (err) {
      console.error('Failed to remove conversation:', err);
    }
  }

  return (
    <div className="flex h-full">
      <div className="w-60 bg-[#2B2D31] flex flex-col border-r border-[#1E1F22]">
        <div className="h-12 px-4 flex items-center gap-2 shadow-sm border-b border-[#1E1F22] font-bold">
          <button 
            onClick={() => router.push('/dm')}
            className="text-gray-400 hover:text-white p-1"
            title="Back to messages"
          >
            <ArrowLeft size={18} />
          </button>
          <span>Messages</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-xs font-semibold text-gray-400 uppercase mb-2 px-2">Private Messages</div>
          <div className="flex flex-col gap-1">
            {conversations.map((conv) => (
              <button
                key={conv.userId}
                onClick={() => router.push(`/dm/${conv.userId}`)}
                className={`flex items-center gap-3 px-2 py-2 rounded transition-colors relative ${
                  conv.userId === currentUserId ? 'bg-[#393C43]' : 'hover:bg-[#34373C]'
                }`}
              >
                <div className="relative">
                  <Avatar src={conv.avatar} name={conv.username} size={32} />
                  {unreadConversations[conv.userId] && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#2B2D31]" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-medium text-white truncate">{conv.username}</div>
                  <div className="text-xs text-gray-400 truncate">{conv.lastMessage}</div>
                </div>
              </button>
            ))}
            {conversations.length === 0 && (
              <p className="text-gray-400 text-sm px-2">No conversations yet</p>
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

      <div className="flex-1 flex flex-col">
        <div className="h-12 px-4 flex items-center justify-between border-b border-[#1E1F22] font-bold">
          {otherUser ? (
            <div className="flex items-center gap-2">
              <Avatar src={otherUser.avatar} name={otherUser.username} size={32} />
              <span>{otherUser.username}</span>
            </div>
          ) : 'Loading...'}
          {otherUser && (
            <button 
              onClick={removeConversation}
              className="text-gray-400 hover:text-red-500 p-1"
              title="Remove conversation"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4" onClick={() => {
            // Mark only this conversation as read when clicking inside messages area
            const savedLastRead = localStorage.getItem('lastReadDMs');
            const lastRead = savedLastRead ? JSON.parse(savedLastRead) : {};
            lastRead[currentUserId] = new Date().toISOString();
            localStorage.setItem('lastReadDMs', JSON.stringify(lastRead));
            setUnreadConversations(prev => {
              const updated = { ...prev };
              delete updated[currentUserId];
              return updated;
            });
          }}>
          {messages.map((msg) => (
            <div key={msg.id} id={`msg-${msg.id}`} className="flex gap-4 items-start group">
              <button
                onClick={(e) => {
                  setContextMenu({ userId: msg.user.id, username: msg.user.username, x: e.clientX, y: e.clientY });
                }}
              >
                <Avatar src={msg.user.avatar} name={msg.user.username} size={40} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      setContextMenu({ userId: msg.user.id, username: msg.user.username, x: e.clientX, y: e.clientY });
                    }}
                    className="font-bold text-white hover:underline hover:text-[#5865F2]"
                  >
                    {msg.user.username}
                  </button>
                  <span className="text-xs text-gray-400">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    onClick={() => setReplyingTo(msg)}
                    className="text-gray-400 hover:text-white p-0.5 rounded"
                    title="Reply"
                  >
                    <Reply size={14} />
                  </button>
                  {msg.user.id === user?.id && (
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuMsgId(openMenuMsgId === msg.id ? null : msg.id)}
                        className="text-gray-400 hover:text-white p-1 rounded"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {openMenuMsgId === msg.id && (
                        <div className="absolute top-full left-0 mt-1 bg-[#18191c] rounded shadow-lg border border-[#1f1f22] py-1 z-10 min-w-[120px]">
                          <button
                            onClick={() => { deleteMessage(msg.id); setOpenMenuMsgId(null); }}
                            className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-[#3F4147] flex items-center gap-2"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {msg.replyTo && (
                  <RepliedToBar
                    username={msg.replyTo.user.username}
                    content={msg.replyTo.content}
                    isEncrypted={true}
                    replyToId={msg.replyTo.id}
                  />
                )}
                <p className="text-gray-300 break-words whitespace-pre-line">
                  <Linkify text={(msg as any).isEncrypted ? decodeMessage(msg.content) : msg.content} />
                </p>
                {(() => {
                  const rawContent = (msg as any).isEncrypted ? decodeMessage(msg.content) : msg.content;
                  const images = extractImages(rawContent);
                  if (images.length === 0) return null;
                  return (
                    <div className="mt-2 space-y-2">
                      {images.map((img, i) => (
                        <GifImage
                          key={i}
                          src={img}
                          alt="Shared image"
                          className="max-w-[300px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(img, '_blank')}
                        />
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-gray-400 text-center">No messages yet. Start the conversation!</p>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="p-4 relative" onClick={() => {
            // Mark only this conversation as read when clicking input area
            const savedLastRead = localStorage.getItem('lastReadDMs');
            const lastRead = savedLastRead ? JSON.parse(savedLastRead) : {};
            lastRead[currentUserId] = new Date().toISOString();
            localStorage.setItem('lastReadDMs', JSON.stringify(lastRead));
            setUnreadConversations(prev => {
              const updated = { ...prev };
              delete updated[currentUserId];
              return updated;
            });
          }}>
          {replyingTo && (
            <ReplyPreview
              username={replyingTo.user?.username || 'User'}
              content={(replyingTo as any).isEncrypted ? decodeMessage(replyingTo.content) : replyingTo.content}
              onCancel={() => setReplyingTo(null)}
            />
          )}
          <ImagePreview imageUrl={imageUrl} onRemove={() => setImageUrl(null)} />
          <div className="flex items-center gap-2 bg-[#383A40] rounded-lg px-4 py-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  const hasCommand = input.trim().startsWith('/');
                  const hasMention = input.includes('@');
                  if (!hasCommand && !hasMention) {
                    e.preventDefault();
                    handleSend();
                  }
                }
              }}
              placeholder={`Message ${otherUser?.username || 'user'}`}
              className="flex-1 bg-transparent outline-none text-gray-200 py-2 resize-none max-h-[200px] overflow-y-auto"
              rows={1}
            />
            <button type="submit" className="text-gray-400 hover:text-white">
              <Send size={20} />
            </button>
          </div>
          <CommandAutocomplete onSelect={setInput} userId={user?.id} username={user?.username} />
        </form>

        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onUpdate={refreshUser}
        />

        {contextMenu && (
          <UserContextMenu
            userId={contextMenu.userId}
            username={contextMenu.username}
            position={{ x: contextMenu.x, y: contextMenu.y }}
            onViewProfile={(id) => setProfileUserId(id)}
            onClose={() => setContextMenu(null)}
          />
        )}

        {profileUserId && (
          <UserProfileModal
            userId={profileUserId}
            onClose={() => setProfileUserId(null)}
          />
        )}
      </div>
    </div>
  );
}
