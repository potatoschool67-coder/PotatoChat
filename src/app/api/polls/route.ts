import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';
import { encodeMessage } from '@/lib/messageEncoding';

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

    const { channelId, question, options } = await req.json();

    if (!channelId || !question || !options || options.length < 2) {
      return NextResponse.json({ error: 'Channel ID, question, and at least 2 options are required' }, { status: 400 });
    }

    const userId = payload.userId as string;

    const poll = await prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          content: encodeMessage(`📊 Poll: ${question}`),
          isEncrypted: true,
          userId,
          channelId,
        },
      });

      const createdPoll = await tx.poll.create({
        data: {
          question,
          messageId: message.id,
          options: {
            create: options.map((text: string) => ({ text })),
          },
        },
        include: {
          options: true,
        },
      });

      return createdPoll;
    });

    return NextResponse.json(poll, { status: 201 });
  } catch (error) {
    console.error('Create poll error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
    }

    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const userId = payload.userId as string;

    const poll = await prisma.poll.findUnique({
      where: { messageId },
      include: {
        options: {
          orderBy: { id: 'asc' },
          include: {
            _count: {
              select: { votes: true },
            },
          },
        },
        votes: {
          where: { userId },
        },
      },
    });

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: poll.id,
      question: poll.question,
      messageId: poll.messageId,
      createdAt: poll.createdAt,
      options: poll.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
        count: opt._count.votes,
        voted: poll.votes.some((v) => v.optionId === opt.id),
      })),
      totalVotes: poll.votes.length,
    });
  } catch (error) {
    console.error('Get poll error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
