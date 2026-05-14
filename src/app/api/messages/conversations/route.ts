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

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { userId },
          { recipientId: userId },
        ],
      },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const userConversations = new Map<string, { userId: string; username: string; avatar: string | null; lastMessage: string; lastMessageAt: Date }>();

    for (const msg of messages) {
      const otherUserId = msg.userId === userId ? msg.recipientId : msg.userId;
      if (!otherUserId) continue;
      
      if (!userConversations.has(otherUserId)) {
        const otherUser = msg.userId === userId 
          ? await prisma.user.findUnique({ where: { id: msg.recipientId! }, select: { id: true, username: true, avatar: true } })
          : { id: msg.user.id, username: msg.user.username, avatar: msg.user.avatar };
        
        if (otherUser) {
          userConversations.set(otherUserId, {
            userId: otherUser.id,
            username: otherUser.username,
            avatar: otherUser.avatar,
            lastMessage: msg.isEncrypted ? Buffer.from(msg.content, 'base64').toString('utf-8') : msg.content,
            lastMessageAt: msg.createdAt,
          });
        }
      }
    }

    const conversations = Array.from(userConversations.values())
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());

    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}