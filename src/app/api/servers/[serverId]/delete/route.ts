import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request, { params }: { params: Promise<{ serverId: string }> }) {
  try {
    const { serverId } = await params;
    await prisma.channel.deleteMany({ where: { serverId } });
    await prisma.serverMember.deleteMany({ where: { serverId } });
    await prisma.server.delete({ where: { id: serverId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Server not found' }, { status: 404 });
  }
}