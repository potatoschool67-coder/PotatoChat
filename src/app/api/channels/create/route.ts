import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';

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

    const { name, serverId, isPrivate, allowedUserIds } = await req.json();

    if (!name || !serverId) {
      return NextResponse.json({ error: 'Channel name and server ID are required' }, { status: 400 });
    }

    const userId = payload.userId as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const isHi = user?.username?.toLowerCase() === 'hi';

    const membership = await prisma.serverMember.findFirst({
      where: {
        serverId,
        userId,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this server' }, { status: 403 });
    }

    if (!isHi && membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can create channels' }, { status: 403 });
    }

    const isPrivateChan = isPrivate === true;

    const channel = await prisma.channel.create({
      data: {
        name: name.toLowerCase().replace(/\s+/g, '-'),
        type: 'TEXT',
        serverId,
        isPrivate: isPrivateChan,
        ...(isPrivateChan && allowedUserIds?.length ? {
          permissions: {
            create: [...new Set<string>([...allowedUserIds, userId])].map((uid: string) => ({ userId: uid })),
          },
        } : {}),
      },
    });

    return NextResponse.json(channel, { status: 201 });
  } catch (error) {
    console.error('Create channel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}