'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, MoreHorizontal, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import CommandAutocomplete from '@/components/utils/CommandAutocomplete';
import MentionAutocomplete from '@/components/utils/MentionAutocomplete';
import Avatar from '@/components/utils/Avatar';
import Linkify from '@/components/utils/Linkify';
import { ensureAudioContext, unlockAudio } from '@/lib/audio';
import { decodeMessage } from '@/lib/messageEncoding';
import { highlightMentions } from '@/lib/mentionHighlight';
import { extractImages, removeImagesFromText } from '@/lib/imageUtils';
import ImagePreview from '@/components/utils/ImagePreview';
import PollCreator from './PollCreator';
import PollMessage from './PollMessage';

interface PollOptionData {
  id: string;
  text: string;
  count: number;
  voted: boolean;
}

interface PollData {
  id: string;
  question: string;
  options: PollOptionData[];
}

interface Message {
  id: string;
  content: string;
  user: { username: string; avatar: string | null; id?: string };
  createdAt: string;
  poll?: PollData | null;
}

export default function ChatWindow({ channelId, serverId, channelName = 'general' }: { channelId: string; serverId: string; channelName?: string }) {
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showCommandAutocomplete, setShowCommandAutocomplete] = useState(false);
  const [openMenuMsgId, setOpenMenuMsgId] = useState<string | null>(null);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const processedRef = useRef(false);

const handleInputChange = (value: string) => {
    if (imageUrl) {
      setInput(value);
      return;
    }
    
    // Check for img src tag first
    const imgMatch = value.match(/src=["']([^"']+)["']/i);
    if (imgMatch) {
      const url = imgMatch[1];
      const cleaned = value.replace(/<img[^>]*>/i, '').trim();
      setImageUrl(url);
      setInput(cleaned);
      return;
    }
    
    // Check for data:image base64
    const dataIdx = value.indexOf('data:image/');
    if (dataIdx !== -1) {
      const rest = value.slice(dataIdx);
      const spaceIdx = rest.indexOf(' ');
      const url = spaceIdx === -1 ? rest : rest.slice(0, spaceIdx);
      if (url.length > 20) {
        setImageUrl(url);
        setInput(value.replace(url, '').trim());
        return;
      }
    }
    
    // Check for regular image URLs
    const imgExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const httpMatch = value.match(/https?:\/\/[^\s]+/i);
    if (httpMatch) {
      const urlLower = httpMatch[0].toLowerCase();
      const isImage = imgExtensions.some(ext => urlLower.includes(ext));
      if (isImage) {
        setImageUrl(httpMatch[0]);
        setInput(value.replace(httpMatch[0], '').trim());
        return;
      }
    }
    
    setInput(value);
  };
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMsgCount = useRef<number>(0);
  const prevMessages = useRef<Message[]>([]);
  const audioCtxRef = useRef<any>(null);

  const playNotificationSound = async () => {
    try {
      const audioCtx = await ensureAudioContext();
      audioCtxRef.current = audioCtx;
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
    if (messages.length > lastMsgCountRef.current) {
      scrollToBottom();
    }
    lastMsgCountRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    ensureAudioContext();
    const handleUnlock = () => {
      unlockAudio();
      document.removeEventListener('click', handleUnlock);
    };
    document.addEventListener('click', handleUnlock);
    return () => document.removeEventListener('click', handleUnlock);
  }, []);

  useEffect(() => {
    prevMessages.current = [];
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
        
        // Only play sound if there are actually new messages (by ID) and you got pinged
        if (prevMessages.current.length > 0) {
          const newMsgIds = data.map((m: Message) => m.id).filter((id: string) => 
            !prevMessages.current.some((m) => m.id === id)
          );
          if (newMsgIds.length > 0) {
            const content = (msg: Message) => (msg as any).isEncrypted ? decodeMessage(msg.content) : msg.content;
            for (const id of newMsgIds) {
              const msg = data.find((m: Message) => m.id === id);
              if (msg && msg.user.id !== currentUser?.id) {
                const msgContent = content(msg);
                const isPingingMe = msgContent.includes(`@${currentUser?.username}`) || msgContent.includes('@everyone');
                if (isPingingMe) {
                  playNotificationSound();
                  break;
                }
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
    const canSend = (input.trim() || imageUrl) && currentUser && !isSending;
    if (!canSend) return;
    
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

    const messageContent = imageUrl ? `${input} ${imageUrl}`.trim() : input;
    
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: messageContent, channelId }),
    });

    if (res.ok) {
      setInput('');
      setImageUrl(null);
      setTimeout(fetchMessages, 500);
    }
    setIsSending(false);
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
                {msg.user?.id === currentUser?.id && (
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
              {msg.poll ? (
                <div className="mt-1">
                  <PollMessage poll={msg.poll} pollId={msg.poll.id} />
                </div>
              ) : (
                <>
                  <p className="text-gray-300">
                      {(() => {
                        const rawContent = (msg as any).isEncrypted ? decodeMessage(msg.content) : msg.content;
                        const images = extractImages(rawContent);
                        const textContent = removeImagesFromText(rawContent);
                        const parts = highlightMentions(textContent);
                        const mentioned = textContent.includes(`@${currentUser?.username}`) || textContent.includes('@everyone');
                        return (
                          <span className={mentioned ? 'bg-[#FBBF24]/10 -mx-2 px-2 rounded block' : ''}>
                            {parts.map((part, i) => (
                              part.isMention ? (
                                <span key={i} className="text-[#5865F2] font-semibold">{part.text}</span>
                              ) : (
                                <span key={i}><Linkify text={part.text} /></span>
                              )
                            ))}
                          </span>
                        );
                      })()}
                    </p>
                    {(() => {
                      const rawContent = (msg as any).isEncrypted ? decodeMessage(msg.content) : msg.content;
                      const images = extractImages(rawContent);
                      if (images.length === 0) return null;
                      return (
                        <div className="mt-2 space-y-2">
                          {images.map((img, i) => (
                            <img
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
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 relative">
        <ImagePreview imageUrl={imageUrl} onRemove={() => setImageUrl(null)} />
        <CommandAutocomplete onSelect={(cmd) => setInput(cmd)} username={currentUser?.username} onShowChange={setShowCommandAutocomplete} />
        <MentionAutocomplete inputValue={input} inputRef={inputRef} onInsert={setInput} serverId={serverId} />
        <div className="flex items-center gap-2 bg-[#383A40] rounded-lg px-4 py-2">
          <button
            type="button"
            onClick={() => setShowPollCreator(true)}
            className="text-gray-400 hover:text-white flex-shrink-0"
            title="Create Poll"
          >
            <Plus size={20} />
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !showCommandAutocomplete) {
                e.preventDefault();
                const form = e.currentTarget.form;
                if (form) form.requestSubmit();
              }
            }}
            placeholder={`Message #${channelName}`}
            className="flex-1 bg-transparent outline-none text-gray-200 py-2"
          />
          <button type="submit" className="text-gray-400 hover:text-white">
            <Send size={20} />
          </button>
        </div>
      </form>
      {showPollCreator && (
        <PollCreator
          channelId={channelId}
          onClose={() => setShowPollCreator(false)}
          onCreated={() => { fetchMessages(); }}
        />
      )}
    </div>
  );
}