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

    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
    });

    if (!user || user.username.toLowerCase() !== 'hi') {
      return NextResponse.json({ error: 'Only the owner can delete servers' }, { status: 403 });
    }

    const { serverId } = await params;
    await prisma.channel.deleteMany({ where: { serverId } });
    await prisma.serverMember.deleteMany({ where: { serverId } });
    await prisma.server.delete({ where: { id: serverId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Server not found' }, { status: 404 });
  }
}