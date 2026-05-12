import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { content, channelId, username } = await req.json();

    if (!content || !channelId || !username) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { username: username.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const message = await prisma.message.create({
      data: { content, userId: user.id, channelId },
    });

    return NextResponse.json({
      id: message.id,
      content: message.content,
      channelId: message.channelId,
      user: { id: user.id, username: user.username, avatar: user.avatar },
      createdAt: message.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Test message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}