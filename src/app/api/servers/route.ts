import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const servers = await prisma.server.findMany({
    select: { id: true, name: true },
  });
  return NextResponse.json(servers);
}

export async function POST(req: Request) {
  try {
    const { name, description, userId } = await req.json();

    if (!name || !userId) {
      return NextResponse.json({ error: 'Name and User ID are required' }, { status: 400 });
    }

    const server = await prisma.server.create({
      data: {
        name,
        description,
        members: {
          create: {
            userId,
            role: 'ADMIN',
          },
        },
      },
    });

    await prisma.channel.create({
      data: {
        name: 'general',
        serverId: server.id,
        type: 'TEXT',
      },
    });

    return NextResponse.json(server, { status: 201 });
  } catch (error) {
    console.error('Server creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
