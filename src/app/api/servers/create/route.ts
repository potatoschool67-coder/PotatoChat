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

    const { name, isPrivate, password } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'Server name is required' }, { status: 400 });
    }

    const existingServer = await prisma.server.findFirst({
      where: { name: name.toLowerCase() },
    });

    if (existingServer) {
      return NextResponse.json({ error: 'Server name already exists' }, { status: 400 });
    }

    const serverCreateData: any = {
      name: name.toLowerCase(),
      isPrivate: isPrivate === true,
      members: {
        create: {
          userId: payload.userId as string,
          role: 'OWNER',
        },
      },
      channels: {
        create: {
          name: 'general',
          type: 'TEXT',
        },
      },
    };

    if (isPrivate && password) {
      serverCreateData.password = password;
    }

    const server = await prisma.server.create({
      data: serverCreateData,
      include: {
        channels: true,
      },
    });

    return NextResponse.json(server, { status: 201 });
  } catch (error) {
    console.error('Create server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
