import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    await prisma.message.deleteMany({ where: { OR: [{ userId }, { recipientId: userId }] } });
    await prisma.serverMember.deleteMany({ where: { userId } });
    await prisma.relationship.deleteMany({ where: { OR: [{ userId }, { recipientId: userId }] } });
    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
}