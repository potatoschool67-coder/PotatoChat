import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const lowerUsername = username.toLowerCase();

    const existingUser = await prisma.user.findFirst({
      where: { username: lowerUsername },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username: lowerUsername,
        password: hashedPassword,
      },
    });

    const mainServer = await prisma.server.findUnique({
      where: { name: 'Main' },
    });

    if (mainServer) {
      await prisma.serverMember.create({
        data: {
          userId: user.id,
          serverId: mainServer.id,
        },
      });
    }

    const token = await signToken({ userId: user.id, username: user.username });

    const response = NextResponse.json({
      message: 'User created successfully',
      user: { id: user.id, username: user.username }
    }, { status: 201 });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
