import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ serverId: string }> }) {
  try {
    const { serverId } = await params;

    const members = await prisma.serverMember.findMany({
      where: { serverId },
      include: {
        user: {
          select: { id: true, username: true, avatar: true, status: true },
        },
      },
    });

    const formattedMembers = members.map(m => ({
      id: m.user.id,
      username: m.user.username,
      avatar: m.user.avatar,
      role: m.role,
      status: m.user.status === 'offline' ? 'offline' : 'online',
    }));

    return NextResponse.json(formattedMembers);
  } catch (error) {
    console.error('Get server members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ serverId: string }> }) {
  try {
    const { serverId } = await params;
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Check if already a member
    const existing = await prisma.serverMember.findUnique({
      where: {
        userId_serverId: { userId, serverId },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Already a member' }, { status: 400 });
    }

    const member = await prisma.serverMember.create({
      data: { userId, serverId },
    });

    return NextResponse.json(member);
  } catch (error) {
    console.error('Add member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ serverId: string }> }) {
  try {
    const { serverId } = await params;
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    await prisma.serverMember.delete({
      where: {
        userId_serverId: { userId, serverId },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}