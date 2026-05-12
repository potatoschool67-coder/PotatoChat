import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';

export async function GET() {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const servers = await prisma.server.findMany({
      where: {
        members: {
          some: { userId: payload.userId as string },
        },
      },
      select: {
        id: true,
        name: true,
        icon: true,
      },
    });

    return NextResponse.json(servers);
  } catch (error) {
    console.error('Get my servers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
