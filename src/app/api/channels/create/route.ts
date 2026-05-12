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

    const { name, serverId } = await req.json();

    if (!name || !serverId) {
      return NextResponse.json({ error: 'Channel name and server ID are required' }, { status: 400 });
    }

    const userId = payload.userId as string;

    const membership = await prisma.serverMember.findFirst({
      where: {
        serverId,
        userId,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this server' }, { status: 403 });
    }

    const channel = await prisma.channel.create({
      data: {
        name: name.toLowerCase().replace(/\s+/g, '-'),
        type: 'TEXT',
        serverId,
      },
    });

    return NextResponse.json(channel, { status: 201 });
  } catch (error) {
    console.error('Create channel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}