import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ serverId: string }> }) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { serverId } = await params;
    const { username, action } = await req.json();

    if (!username || !action || !['admin', 'unadmin'].includes(action)) {
      return NextResponse.json({ error: 'Username and action (admin/unadmin) are required' }, { status: 400 });
    }

    const requesterId = payload.userId as string;

    const requesterMember = await prisma.serverMember.findFirst({
      where: { serverId, userId: requesterId },
    });

    if (!requesterMember || requesterMember.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only the server owner can change roles' }, { status: 403 });
    }

    const targetUser = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.id === requesterId) {
      return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 });
    }

    const targetMember = await prisma.serverMember.findFirst({
      where: { serverId, userId: targetUser.id },
    });

    if (!targetMember) {
      return NextResponse.json({ error: 'User is not a member of this server' }, { status: 400 });
    }

    if (action === 'admin') {
      if (targetMember.role === 'ADMIN') {
        return NextResponse.json({ error: 'User is already an admin' }, { status: 400 });
      }
      await prisma.serverMember.update({
        where: { id: targetMember.id },
        data: { role: 'ADMIN' },
      });
      return NextResponse.json({ success: true, message: `${targetUser.username} is now an admin` });
    } else {
      if (targetMember.role === 'GUEST') {
        return NextResponse.json({ error: 'User is already a guest' }, { status: 400 });
      }
      await prisma.serverMember.update({
        where: { id: targetMember.id },
        data: { role: 'GUEST' },
      });
      return NextResponse.json({ success: true, message: `${targetUser.username} is no longer an admin` });
    }
  } catch (error) {
    console.error('Role change error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
