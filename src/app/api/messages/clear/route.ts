import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';

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
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID required' }, { status: 400 });
    }

    // Check if user is a member of the server containing this channel
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { server: true },
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const membership = await prisma.serverMember.findFirst({
      where: {
        serverId: channel.serverId,
        userId: payload.userId as string,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Delete all messages in the channel
    await prisma.message.deleteMany({
      where: { channelId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Clear messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}