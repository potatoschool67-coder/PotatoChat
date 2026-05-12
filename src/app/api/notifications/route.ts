import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const userId = payload.userId as string;
    const notifications: {type: string; from: string; preview: string; time: string}[] = [];

    // Get user's servers
    const memberships = await prisma.serverMember.findMany({
      where: { userId },
      select: { serverId: true },
    });

    if (memberships.length > 0) {
      const serverIds = memberships.map(m => m.serverId);
      
      // Get channels in those servers
      const channels = await prisma.channel.findMany({
        where: { serverId: { in: serverIds } },
        select: { id: true, name: true, server: { select: { name: true } } },
      });

      if (channels.length > 0) {
        const channelIds = channels.map(c => c.id);
        
        // Get recent messages in those channels (not from user)
        const recentMessages = await prisma.message.findMany({
          where: {
            channelId: { in: channelIds },
            NOT: { userId },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            user: { select: { username: true } },
          },
        });

        for (const msg of recentMessages) {
          const channel = channels.find(c => c.id === msg.channelId);
          notifications.push({
            type: 'server',
            from: `${msg.user.username} in ${channel?.server?.name}/${channel?.name || 'unknown'}`,
            preview: msg.content.substring(0, 40),
            time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        }
      }
    }

    // Get recent DMs
    const recentDMs = await prisma.message.findMany({
      where: {
        recipientId: userId,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: { select: { username: true } },
      },
    });

    for (const msg of recentDMs) {
      notifications.push({
        type: 'dm',
        from: msg.user.username,
        preview: msg.content.substring(0, 40),
        time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }

    return NextResponse.json({
      unreadCount: notifications.length,
      recent: notifications.slice(0, 10),
    });
  } catch (error) {
    console.error('Notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}