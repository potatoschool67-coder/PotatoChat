import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const { optionId } = await req.json();

    if (!optionId) {
      return NextResponse.json({ error: 'optionId is required' }, { status: 400 });
    }

    const userId = payload.userId as string;

    const option = await prisma.pollOption.findUnique({
      where: { id: optionId },
    });

    if (!option || option.pollId !== pollId) {
      return NextResponse.json({ error: 'Invalid option' }, { status: 400 });
    }

    const existingVote = await prisma.vote.findFirst({
      where: {
        userId,
        pollId,
      },
    });

    if (existingVote) {
      if (existingVote.optionId === optionId) {
        await prisma.vote.delete({
          where: { id: existingVote.id },
        });
        return NextResponse.json({ action: 'removed' });
      } else {
        await prisma.vote.delete({
          where: { id: existingVote.id },
        });
      }
    }

    await prisma.vote.create({
      data: {
        optionId,
        userId,
        pollId,
      },
    });

    return NextResponse.json({ action: existingVote ? 'switched' : 'voted' });
  } catch (error) {
    console.error('Vote error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
