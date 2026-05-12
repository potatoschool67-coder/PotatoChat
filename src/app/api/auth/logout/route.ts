import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';

async function handleLogout() {
  const token = await getAuthToken();
  if (token) {
    const payload = await verifyToken(token);
    if (payload?.userId) {
      await prisma.user.update({
        where: { id: payload.userId as string },
        data: { status: 'offline' },
      });
    }
  }

  const response = NextResponse.json({ message: 'Logged out' });

  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}

export async function GET() {
  return handleLogout();
}

export async function POST() {
  return handleLogout();
}