import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';
import { encodeMessage } from '@/lib/messageEncoding';

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

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const otherUserId = searchParams.get('otherUserId');

    if (!otherUserId) {
      return NextResponse.json({ error: 'Other user ID is required' }, { status: 400 });
    }

    const myUserId = payload.userId as string;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { userId: myUserId, recipientId: otherUserId },
          { userId: otherUserId, recipientId: myUserId },
        ],
      },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            userId: true,
            user: { select: { username: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Get DM error:', error);
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

    const { content, recipientId, replyToId } = await req.json();

    if (!content || !recipientId) {
      return NextResponse.json({ error: 'Content and recipient are required' }, { status: 400 });
    }

    const userId = payload.userId as string;

    const message = await prisma.message.create({
      data: {
        content: encodeMessage(content),
        isEncrypted: true,
        userId,
        recipientId,
        replyToId: replyToId || undefined,
      },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Send DM error:', error);
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
    const otherUserId = searchParams.get('otherUserId');

    if (!otherUserId) {
      return NextResponse.json({ error: 'Other user ID is required' }, { status: 400 });
    }

    const myUserId = payload.userId as string;

    // Delete all messages between these two users
    await prisma.message.deleteMany({
      where: {
        OR: [
          { userId: myUserId, recipientId: otherUserId },
          { userId: otherUserId, recipientId: myUserId },
        ],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Clear DM error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}