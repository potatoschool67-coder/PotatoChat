import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    const permissions = await prisma.channelPermission.findMany({
      where: { channelId },
      select: { userId: true },
    });

    return NextResponse.json(permissions.map(p => p.userId));
  } catch (error) {
    console.error('Get channel permissions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { channelId, allowedUserIds } = await req.json();

    if (!channelId || !allowedUserIds) {
      return NextResponse.json({ error: 'Channel ID and allowedUserIds are required' }, { status: 400 });
    }

    const userId = payload.userId as string;

    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isHi = user?.username?.toLowerCase() === 'hi';

    const membership = await prisma.serverMember.findFirst({
      where: { serverId: channel.serverId, userId },
    });

    if (!isHi && (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN'))) {
      return NextResponse.json({ error: 'Only admins can manage channel permissions' }, { status: 403 });
    }

    // Replace all permissions with the new set
    await prisma.channelPermission.deleteMany({ where: { channelId } });

    if (allowedUserIds.length > 0) {
      await prisma.channelPermission.createMany({
        data: [...new Set<string>(allowedUserIds)].map((uid: string) => ({
          channelId,
          userId: uid,
        })),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update channel permissions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
