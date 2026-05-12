import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

const settingsPath = path.join(process.cwd(), '.ollama-model');

export async function POST(req: Request) {
  try {
    const { message, userId, channelId, serverId } = await req.json();

    if (!message || !userId) {
      return NextResponse.json({ error: 'Missing message or userId' }, { status: 400 });
    }

    // Get current model from file
    let currentModel = 'gemma4:31b-cloud';
    try {
      if (fs.existsSync(settingsPath)) {
        currentModel = fs.readFileSync(settingsPath, 'utf8').trim();
      }
    } catch (e) {}

    // Call Ollama API
    const ollamaRes = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: currentModel,
        messages: [{ role: 'user', content: message }],
        stream: false,
      }),
    });

    if (!ollamaRes.ok) {
      return NextResponse.json({ error: 'Ollama API error' }, { status: 500 });
    }

    const ollamaData = await ollamaRes.json();
    const botResponse = ollamaData.message?.content || 'Sorry, I could not generate a response.';

    // Find potatobot user
    const potatobotUser = await prisma.user.findUnique({
      where: { username: 'potatobot' },
    });

    if (!potatobotUser) {
      return NextResponse.json({ error: 'PotatoBot user not found' }, { status: 404 });
    }

    let savedMessage;
    if (channelId && serverId) {
      // Save message to channel (for server chat)
      savedMessage = await prisma.message.create({
        data: {
          content: botResponse,
          userId: potatobotUser.id,
          channelId,
        },
        include: {
          user: {
            select: { id: true, username: true, avatar: true },
          },
        },
      });
    } else {
      // Save message to DM (for direct message)
      savedMessage = await prisma.message.create({
        data: {
          content: botResponse,
          userId: potatobotUser.id,
          recipientId: userId,
        },
        include: {
          user: {
            select: { id: true, username: true, avatar: true },
          },
        },
      });
    }

    return NextResponse.json(savedMessage);
  } catch (error) {
    console.error('PotatoBot chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}