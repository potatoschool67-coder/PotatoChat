import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';
import { encodeMessage } from '@/lib/messageEncoding';

async function checkChannelAccess(channelId: string, userId: string): Promise<boolean> {
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel) return false;
  if (!channel.isPrivate) return true;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const isHi = user?.username?.toLowerCase() === 'hi';
  if (isHi) return true;

  const membership = await prisma.serverMember.findFirst({
    where: { serverId: channel.serverId, userId },
  });
  if (membership?.role === 'OWNER' || membership?.role === 'ADMIN') return true;

  const permission = await prisma.channelPermission.findUnique({
    where: { channelId_userId: { channelId, userId } },
  });
  return !!permission;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get('channelId');
    const channelName = searchParams.get('channelName');

    let whereClause: any = {};
    
    if (channelId) {
      whereClause.channelId = channelId;
    } else if (channelName) {
      const channel = await prisma.channel.findFirst({
        where: { name: channelName },
      });
      if (!channel) {
        return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
      }
      whereClause.channelId = channel.id;
    } else {
      return NextResponse.json({ error: 'Channel ID or name is required' }, { status: 400 });
    }

    const token = await getAuthToken();
    let currentUserId = '';
    if (token) {
      const payload = await verifyToken(token);
      if (payload?.userId) {
        currentUserId = payload.userId as string;
      }
    }

    const resolvedChannelId = whereClause.channelId;
    if (resolvedChannelId && currentUserId) {
      const hasAccess = await checkChannelAccess(resolvedChannelId, currentUserId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'You do not have access to this channel' }, { status: 403 });
      }
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
        poll: {
          include: {
            options: {
              orderBy: { id: 'asc' },
              include: {
                _count: {
                  select: { votes: true },
                },
              },
            },
            votes: currentUserId ? {
              where: { userId: currentUserId },
            } : false,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const formatted = messages.map((msg) => {
      const formatted: any = { ...msg, poll: null };
      if (msg.poll) {
        formatted.poll = {
          id: msg.poll.id,
          question: msg.poll.question,
          options: msg.poll.options.map((opt) => ({
            id: opt.id,
            text: opt.text,
            count: opt._count.votes,
            voted: Array.isArray(msg.poll?.votes) && msg.poll.votes.some((v: any) => v.optionId === opt.id),
          })),
        };
      }
      return formatted;
    });

    return NextResponse.json(formatted);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { content, channelId, channelName } = await req.json();

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    let finalChannelId = channelId;
    
    if (!finalChannelId && channelName) {
      const channel = await prisma.channel.findFirst({
        where: { name: channelName },
      });
      if (!channel) {
        return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
      }
      finalChannelId = channel.id;
    }

    if (!finalChannelId) {
      return NextResponse.json({ error: 'Channel ID or name is required' }, { status: 400 });
    }

    const userId = payload.userId as string;

    const hasAccess = await checkChannelAccess(finalChannelId, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'You do not have access to this channel' }, { status: 403 });
    }

    const message = await prisma.message.create({
      data: {
        content: encodeMessage(content),
        isEncrypted: true,
        userId,
        channelId: finalChannelId,
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Create message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get('id');

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.userId !== payload.userId) {
      return NextResponse.json({ error: 'Can only delete your own messages' }, { status: 403 });
    }

    await prisma.message.delete({
      where: { id: messageId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
