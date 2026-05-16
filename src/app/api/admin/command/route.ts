import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { command, userId, args } = await req.json();

    if (!command || !userId) {
      return NextResponse.json({ error: 'Missing command or userId' }, { status: 400 });
    }

    // Verify the user is "hi"
    const requestingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!requestingUser || requestingUser.username.toLowerCase() !== 'hi') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Find admin user
    const admin = await prisma.user.findUnique({
      where: { username: 'admin' },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    let response = '';

    switch (command) {
      case 'ping':
        response = 'Pong! 🏓 Admin is online.';
        break;

      case 'servers':
        const servers = await prisma.server.findMany({ select: { name: true } });
        response = servers.length > 0 
          ? `All servers: ${servers.map(s => s.name).join(', ')}`
          : 'No servers exist yet.';
        break;
      case 'users':
        const users = await prisma.user.findMany({ select: { username: true } });
        response = `All users: ${users.map(u => u.username).join(', ')}`;
        break;
      case 'login':
        response = 'You are already logged in!';
        break;
      case 'logout':
        response = 'You have been logged out from the bot.';
        break;
      case 'notloggedin':
        response = 'You must login first. Type /login [password]';
        break;
      case 'help':
        response = 'Bot Commands:\n/ping - Check bot status\n/servers - List all servers\n/users - List all users\n/ban [username] - Ban a user\n/unban [username] - Unban a user\n/userdelete [username] - Delete a user\n/serverdelete [servername] - Delete a server\n/dmuser [message] [username] - Send DM to user\n/logout - Logout from bot\n/help - Show this help';
        break;
      case 'wrongpassword':
        response = 'Incorrect password. Try again.';
        break;
      case 'ban':
        if (!args) {
          response = 'Usage: /ban [username]';
          break;
        }
        const bannedUser = await prisma.user.findUnique({ where: { username: args } });
        if (!bannedUser) {
          response = `User "${args}" not found.`;
        } else {
          await prisma.user.update({
            where: { id: bannedUser.id },
            data: { status: 'banned' },
          });
          response = `User "${args}" has been banned.`;
        }
        break;
      case 'unban':
        if (!args) {
          response = 'Usage: /unban [username]';
          break;
        }
        const unbannedUser = await prisma.user.findUnique({ where: { username: args } });
        if (!unbannedUser) {
          response = `User "${args}" not found.`;
        } else {
          await prisma.user.update({
            where: { id: unbannedUser.id },
            data: { status: 'offline' },
          });
          response = `User "${args}" has been unbanned.`;
        }
        break;
      case 'userdelete':
        if (!args) {
          response = 'Usage: /userdelete [username]';
          break;
        }
        const deleteUser = await prisma.user.findUnique({ where: { username: args } });
        if (!deleteUser) {
          response = `User "${args}" not found.`;
        } else {
          await prisma.message.deleteMany({ where: { OR: [{ userId: deleteUser.id }, { recipientId: deleteUser.id }] } });
          await prisma.serverMember.deleteMany({ where: { userId: deleteUser.id } });
          await prisma.relationship.deleteMany({ where: { OR: [{ userId: deleteUser.id }, { recipientId: deleteUser.id }] } });
          await prisma.user.delete({ where: { id: deleteUser.id } });
          response = `User "${args}" has been deleted.`;
        }
        break;
case 'serverdelete':
        const deleteServer = await prisma.server.findUnique({ where: { name: args } });
        if (!deleteServer) {
          response = `Server "${args}" not found.`;
        } else {
          await prisma.channel.deleteMany({ where: { serverId: deleteServer.id } });
          await prisma.serverMember.deleteMany({ where: { serverId: deleteServer.id } });
          await prisma.server.delete({ where: { id: deleteServer.id } });
          response = `Server "${args}" has been deleted.`;
        }
        break;
      case 'dmuser':
        const dmParts = args.split(' ');
        if (dmParts.length < 2) {
          response = 'Usage: /dmuser [message] [recipientusername]';
          break;
        }
        const recipientUsername = dmParts[dmParts.length - 1];
        const messageText = dmParts.slice(0, -1).join(' ');
        const recipientUser = await prisma.user.findUnique({ where: { username: recipientUsername } });
        if (!recipientUser) {
          response = `User "${recipientUsername}" not found.`;
        } else {
          await prisma.message.create({
            data: {
              content: messageText,
              userId: admin.id,
              recipientId: recipientUser.id,
            },
          });
          response = `DM sent to ${recipientUsername}: "${messageText}"`;
        }
        break;
      case 'loginuser':
        const targetUser = await prisma.user.findUnique({ where: { username: args } });
        if (!targetUser) {
          response = `User "${args}" not found.`;
        } else {
          const token = await signToken({ userId: targetUser.id, username: targetUser.username });
          return NextResponse.json({ 
            message: `Switched to ${targetUser.username}`,
            token,
            user: { id: targetUser.id, username: targetUser.username }
          }, { 
            status: 200,
            headers: {
              'Set-Cookie': `auth-token=${token}; Path=/; Max-Age=${60*60*24*7}; HttpOnly`
            }
          });
        }
        break;
      case 'ownerbadge':
        if (args === 'off') {
          response = 'Owner badge disabled.';
        } else if (args === 'on') {
          response = 'Owner badge enabled for hi.';
        } else {
          response = 'Usage: /ownerbadge on or /ownerbadge off';
        }
        break;
      default:
        response = `Unknown command: ${command}. Type /help for available commands.`;
    }

    // Create message from admin to user
    const message = await prisma.message.create({
      data: {
        content: response,
        userId: admin.id,
        recipientId: userId,
      },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    return NextResponse.json({ message, response });
  } catch (error) {
    console.error('Admin command error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}