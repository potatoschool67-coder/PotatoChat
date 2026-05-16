import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';

export async function DELETE(req: Request, { params }: { params: Promise<{ serverId: string }> }) {
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
    const userId = payload.userId as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isHi = user.username.toLowerCase() === 'hi';
    const membership = await prisma.serverMember.findFirst({
      where: { serverId, userId },
    });
    const isOwner = membership?.role === 'OWNER';

    if (!isHi && !isOwner) {
      return NextResponse.json({ error: 'Only the server owner can delete this server' }, { status: 403 });
    }
    await prisma.channel.deleteMany({ where: { serverId } });
    await prisma.serverMember.deleteMany({ where: { serverId } });
    await prisma.server.delete({ where: { id: serverId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Server not found' }, { status: 404 });
  }
}