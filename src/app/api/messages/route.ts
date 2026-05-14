import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';
import { encodeMessage } from '@/lib/messageEncoding';

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

    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(messages);
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
