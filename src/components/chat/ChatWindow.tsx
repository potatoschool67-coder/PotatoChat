'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import CommandAutocomplete from '@/components/utils/CommandAutocomplete';
import Avatar from '@/components/utils/Avatar';
import Linkify from '@/components/utils/Linkify';

interface Message {
  id: string;
  content: string;
  user: { username: string; avatar: string | null; id?: string };
  createdAt: string;
}

export default function ChatWindow({ channelId, serverId, channelName = 'general' }: { channelId: string; serverId: string; channelName?: string }) {
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMsgCount = useRef<number>(0);
  const prevMessages = useRef<Message[]>([]);
  const audioCtxRef = useRef<any>(null);

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
    } catch (e) {
      console.error('Audio error:', e);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const lastMsgCountRef = useRef(0);

  useEffect(() => {
    // Only auto-scroll when new messages are added
    if (messages.length > lastMsgCountRef.current) {
      scrollToBottom();
    }
    lastMsgCountRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    prevMessages.current = [];
    
    // Unlock audio on first click
    const unlockAudio = () => {
      getAudioContext();
      document.removeEventListener('click', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    
    return () => document.removeEventListener('click', unlockAudio);
  }, [channelId]);

  useEffect(() => {
    if (!channelId) return;

    fetchMessages();

    // Poll every 2 seconds normally, faster when tab is hidden
    let pollInterval = setInterval(() => {
      fetchMessages();
    }, 2000);

    // Mark channel as read when actively viewing
    const markChannelRead = () => {
      localStorage.setItem(`lastRead_${channelId}`, new Date().toISOString());
    };
    
    // Mark as read immediately when messages are received
    markChannelRead();

    // When tab becomes visible, immediately check for new messages
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchMessages();
        markChannelRead();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [channelId]);

  async function fetchMessages() {
    if (!channelId) return;
    try {
      const res = await fetch(`/api/messages?channelId=${channelId}`);
      if (res.ok) {
        const data = await res.json();
        
        // Only play sound if there are actually new messages (by ID)
        if (prevMessages.current.length > 0) {
          const newMsgIds = data.map((m: Message) => m.id).filter((id: string) => 
            !prevMessages.current.some((m) => m.id === id)
          );
          if (newMsgIds.length > 0) {
            for (const id of newMsgIds) {
              const msg = data.find((m: Message) => m.id === id);
              if (msg && msg.user.id !== currentUser?.id) {
                playNotificationSound();
                break;
              }
            }
          }
        }
        
        prevMessages.current = data;
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !currentUser || isSending) return;
    
    setIsSending(true);

    if (input.trim().startsWith('/potatobot')) {
      const POTATOBOT_ID = 'cmoy30cd10000h071hxutrqvr';
      const args = input.trim().split(' ').slice(1).join(' ');
      
      // Save user's message first
      const saveRes = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input, channelId }),
      });
      
      if (args === 'remove') {
        const res = await fetch(`/api/servers/${serverId}/members`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: POTATOBOT_ID }),
        });
        if (res.ok) {
          alert('PotatoBot removed from server');
        } else {
          const data = await res.json();
          alert(data.error || 'Failed to remove');
        }
        setInput('');
        fetchMessages();
        setIsSending(false);
        return;
      }
      
      // Just /potatobot - add as member
      if (args === '') {
        const memberRes = await fetch(`/api/servers/${serverId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: POTATOBOT_ID }),
        });
        if (memberRes.ok) {
          alert('PotatoBot added to server! Now type /potatobot [question] to chat');
        } else {
          const data = await memberRes.json();
          if (data.error === 'Already a member') {
            alert('PotatoBot is already in this server! Type /potatobot [question] to chat');
          } else {
            alert(data.error || 'Failed to add');
          }
          setInput('');
          fetchMessages();
          setIsSending(false);
          return;
        }
        
        // Check if PotatoBot is a member first
        const membersRes = await fetch(`/api/servers/${serverId}/members`);
        if (membersRes.ok) {
          const members = await membersRes.json();
          const hasPotatoBot = members.some((m: any) => m.id === POTATOBOT_ID);
          if (!hasPotatoBot) {
            alert('PotatoBot is not in this server. Type /potatobot first to add me!');
            setInput('');
            fetchMessages();
            setIsSending(false);
            return;
          }
        }
        
        // Ask PotatoBot a question
        setInput('');
        const res = await fetch('/api/ollama/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: args, userId: currentUser.id, channelId, serverId }),
        });
        
        if (res.ok) {
          fetchMessages();
        } else {
          alert('PotatoBot is not responding. Make sure Ollama is running.');
          fetchMessages();
        }
        setIsSending(false);
        return;
      }
    }

    if (input.trim() === '/clear') {
      if (!confirm('Are you sure you want to delete all messages in this channel?')) return;
      
      const res = await fetch(`/api/messages/clear?channelId=${channelId}`, {
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
      alert('Server Commands:\n/potatobot - Add PotatoBot to server\n/potatobot [question] - Ask PotatoBot\n/potatobot remove - Remove PotatoBot\n/clear - Clear all messages\n/help - Show this help');
      setInput('');
      setIsSending(false);
      return;
    }

    // Check for admin commands from user "hi"
    const isHi = currentUser?.username?.toLowerCase() === 'hi';
    if (isHi && input.trim().startsWith('/')) {
      const cmd = input.trim().split(' ')[0].replace('/', '');
      const args = input.trim().split(' ').slice(1).join(' ');
      
      if (cmd === 'ownerbadge') {
        setInput('');
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
        setIsSending(false);
        return;
      }
    }

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: input, channelId }),
    });

    if (res.ok) {
      setInput('');
      // Will be fetched by poll
      setTimeout(fetchMessages, 500);
    }
    setIsSending(false);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 bg-[#313338] border-b border-[#1f1f22]">
        <span className="text-xs text-gray-400">
          Messages update every 2 seconds
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-4 items-start">
            <Avatar src={msg.user?.avatar} name={msg.user?.username || 'User'} size={40} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{msg.user?.username || 'User'}</span>
                <span className="text-xs text-gray-400">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-gray-300"><Linkify text={msg.content} /></p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 relative">
        <CommandAutocomplete onSelect={(cmd) => setInput(cmd)} username={currentUser?.username} />
        <div className="flex items-center gap-2 bg-[#383A40] rounded-lg px-4 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message #${channelName}`}
            className="flex-1 bg-transparent outline-none text-gray-200 py-2"
          />
          <button type="submit" className="text-gray-400 hover:text-white">
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}