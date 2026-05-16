import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: Promise<{ serverId: string }> }) {
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
    const { name, icon, makePublic } = await req.json();

    // Check if user is a member of this server
    const membership = await prisma.serverMember.findFirst({
      where: {
        serverId,
        userId: payload.userId as string,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Check if user is admin or owner for sensitive changes
    if (membership.role !== 'ADMIN' && membership.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only admins can make this change' }, { status: 403 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (icon !== undefined) updateData.icon = icon || null;
    if (makePublic === true) {
      updateData.isPrivate = false;
      updateData.password = null;
    }

    const server = await prisma.server.update({
      where: { id: serverId },
      data: updateData,
    });

    return NextResponse.json(server);
  } catch (error: any) {
    console.error('Update server error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}