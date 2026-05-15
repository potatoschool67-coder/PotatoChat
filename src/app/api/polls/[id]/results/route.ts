import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { id: pollId } = await params;

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          orderBy: { id: 'asc' },
          include: {
            votes: {
              include: {
                user: {
                  select: { id: true, username: true, avatar: true },
                },
              },
            },
          },
        },
      },
    });

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: poll.id,
      question: poll.question,
      options: poll.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
        voters: opt.votes.map((v) => ({
          id: v.user.id,
          username: v.user.username,
          avatar: v.user.avatar,
        })),
      })),
    });
  } catch (error) {
    console.error('Get poll results error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
