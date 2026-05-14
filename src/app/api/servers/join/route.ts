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

    const { serverName, password } = await req.json();
    if (!serverName) {
      return NextResponse.json({ error: 'Server name is required' }, { status: 400 });
    }

    const server = await prisma.server.findFirst({
      where: { name: { contains: serverName } },
    });

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    if (server.isPrivate && server.password) {
      if (!password) {
        return NextResponse.json({ error: 'Password required', requiresPassword: true }, { status: 403 });
      }
      if (password !== server.password) {
        return NextResponse.json({ error: 'Incorrect password', requiresPassword: true }, { status: 403 });
      }
    }

    const userId = payload.userId as string;

    const membership = await prisma.serverMember.upsert({
      where: {
        userId_serverId: {
          userId,
          serverId: server.id,
        },
      },
      update: {},
      create: {
        userId,
        serverId: server.id,
        role: 'GUEST',
      },
    });

    return NextResponse.json({ server, membership }, { status: 200 });
  } catch (error) {
    console.error('Join server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
