'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Send, MessageSquare, ArrowLeft, Trash2, Settings, LogOut } from 'lucide-react';
import Avatar from '@/components/utils/Avatar';
import Linkify from '@/components/utils/Linkify';
import SettingsModal from '@/components/modals/SettingsModal';
import CommandAutocomplete from '@/components/utils/CommandAutocomplete';
import { useAuth } from '@/context/AuthContext';

interface Message {
  id: string;
  content: string;
  user: { id: string; username: string; avatar: string | null };
  createdAt: string;
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
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const OLLAMA_USER_ID = 'cmoy30cd10000h071hxutrqvr';

  const prevMessages = useRef<Message[]>([]);
  const audioCtxRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playNotificationSound = () => {
    try {
      const audioCtx = getAudioContext();
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
    } catch (e) {}
  };

  useEffect(() => {
    async function fetchConversations() {
      try {
        const res = await fetch('/api/messages/conversations');
        if (res.ok) {
          const data = await res.json();
          setConversations(data);
        }
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
      }
    }
    fetchConversations();
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
    
    const unlockAudio = () => {
      getAudioContext();
      document.removeEventListener('click', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    
    return () => document.removeEventListener('click', unlockAudio);
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

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

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
        alert('Admin Commands:\n/ping - Check bot status\n/ollama - Check Ollama status\n/potatobot - Get/set model\n/potatobot start - Start Ollama\n/potatobot stop - Stop Ollama\n/servers - List all servers\n/users - List all users\n/ban [username] - Ban a user\n/unban [username] - Unban a user\n/userdelete [username] - Delete a user\n/serverdelete [servername] - Delete a server\n/dmuser [message] [username] - Send DM to user\n/loginuser [username] - Login as user\n/ownerbadge on - Enable owner badge\n/ownerbadge off - Disable owner badge\n/clear - Clear messages\n/help - Show this help');
        setInput('');
        return;
      }

      const parts = input.trim().split(' ');
      const commandName = parts[0].replace('/', '');
      const args = parts.slice(1).join(' ');
      const validCommands = ['ping', 'ollama', 'potatobot', 'servers', 'users', 'ban', 'unban', 'userdelete', 'serverdelete', 'dmuser', 'loginuser', 'ownerbadge'];
      
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
      if (!confirm('Are you sure you want to delete all messages in this conversation?')) return;
      
      const res = await fetch(`/api/messages/dm?otherUserId=${currentUserId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setMessages([]);
        setInput('');
      } else {
        alert('Failed to clear messages');
      }
      return;
    }

    if (input.trim() === '/help') {
      alert('Available commands:\n/clear - Delete all messages in this conversation\n/help - Show this help message');
      setInput('');
      return;
    }

    if (currentUserId === OLLAMA_USER_ID) {
      const msg = input;
      setInput('');
      
      await fetch('/api/messages/dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: msg, recipientId: currentUserId }),
      });

      const res = await fetch('/api/ollama/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, userId: user?.id }),
      });

      if (res.ok) {
        fetchMessages();
      }
      return;
    }

    const res = await fetch('/api/messages/dm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: input, recipientId: currentUserId }),
    });

    if (res.ok) {
      setInput('');
      fetch('/api/messages/dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input, recipientId: currentUserId }),
      });
      fetchMessages();
    }
  }

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
                className={`flex items-center gap-3 px-2 py-2 rounded transition-colors ${
                  conv.userId === currentUserId ? 'bg-[#393C43]' : 'hover:bg-[#34373C]'
                }`}
              >
                <Avatar src={conv.avatar} name={conv.username} size={32} />
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
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-4 items-start">
              <Avatar src={msg.user.avatar} name={msg.user.username} size={40} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{msg.user.username}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-gray-300"><Linkify text={msg.content} /></p>
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-gray-400 text-center">No messages yet. Start the conversation!</p>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="p-4 relative">
          <div className="flex items-center gap-2 bg-[#383A40] rounded-lg px-4 py-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message ${otherUser?.username || 'user'}`}
              className="flex-1 bg-transparent outline-none text-gray-200 py-2"
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
      </div>
    </div>
  );
}
