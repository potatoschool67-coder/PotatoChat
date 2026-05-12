'use client';

import React, { useEffect, useState } from 'react';
import ChatWindow from '@/components/chat/ChatWindow';
import { useParams } from 'next/navigation';

export default function ChannelPage() {
  const params = useParams();
  const serverId = params.serverId as string;
  const channelId = params.channelId as string;
  const [channelName, setChannelName] = useState('general');

  useEffect(() => {
    async function fetchChannel() {
      try {
        const res = await fetch(`/api/channels?serverId=${serverId}`);
        if (res.ok) {
          const data = await res.json();
          const channel = data.find((c: any) => c.id === channelId);
          if (channel) {
            setChannelName(channel.name);
          }
        }
      } catch (err) {
        console.error('Failed to fetch channel:', err);
      }
    }
    if (serverId && channelId) {
      fetchChannel();
    }
  }, [serverId, channelId]);

  return (
    <div className="flex-1 h-full">
      <ChatWindow channelId={channelId} serverId={serverId} channelName={channelName} />
    </div>
  );
}
