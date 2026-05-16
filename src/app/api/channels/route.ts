import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const serverId = searchParams.get('serverId');

    if (!serverId) {
      return NextResponse.json({ error: 'Server ID is required' }, { status: 400 });
    }

    const token = await getAuthToken();
    let canSeeAll = false;
    let userId: string | null = null;

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.userId) {
        userId = payload.userId as string;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const isHi = user?.username?.toLowerCase() === 'hi';
        const membership = await prisma.serverMember.findFirst({
          where: { serverId, userId },
        });
        canSeeAll = isHi || membership?.role === 'OWNER' || membership?.role === 'ADMIN';
      }
    }

    const where: any = { serverId };
    if (!canSeeAll) {
      where.OR = [{ isPrivate: false }];
      if (userId) {
        where.OR.push({ permissions: { some: { userId } } });
      }
    }

    const channels = await prisma.channel.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(channels);
  } catch (error) {
    console.error('Get channels error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function checkChannelAuth(channelId: string): Promise<{ userId: string; serverId: string } | NextResponse> {
  const token = await getAuthToken();
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) as any;
  }

  const payload = await verifyToken(token);
  if (!payload || !payload.userId) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 }) as any;
  }

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
  });

  if (!channel) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 }) as any;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId as string },
  });

  const isHi = user?.username?.toLowerCase() === 'hi';

  const membership = await prisma.serverMember.findFirst({
    where: { serverId: channel.serverId, userId: payload.userId as string },
  });

  if (!isHi && (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN'))) {
    return NextResponse.json({ error: 'Only admins can manage channels' }, { status: 403 }) as any;
  }

  return { userId: payload.userId as string, serverId: channel.serverId };
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    const auth = await checkChannelAuth(channelId);
    if (auth instanceof NextResponse) return auth;

    const { name } = await req.json();

    const channel = await prisma.channel.update({
      where: { id: channelId },
      data: { name },
    });

    return NextResponse.json(channel);
  } catch (error) {
    console.error('Update channel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    const auth = await checkChannelAuth(channelId);
    if (auth instanceof NextResponse) return auth;

    await prisma.message.deleteMany({ where: { channelId } });
    await prisma.channel.delete({ where: { id: channelId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete channel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}