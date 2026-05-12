#!/usr/bin/env node

import { createInterface } from 'readline';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:3000';
const socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling'],
  reconnection: true,
});

const rl = createInterface({ input: process.stdin, output: process.stdout });

socket.on('connect', () => process.stdout.write('Connected to socket server\n'));
socket.on('connect_error', (err) => process.stdout.write(`Socket error: ${err.message}\n`));

async function request(endpoint: string) {
  const res = await fetch(`${API_URL}${endpoint}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function selectFromList(prompt: string, items: string[]) {
  process.stdout.write('\n' + prompt + '\n');
  items.forEach((item, i) => process.stdout.write(`  ${i + 1}. ${item}\n`));
  process.stdout.write('  0. Cancel\n');
  
  return new Promise((resolve) => {
    rl.question('\n> ', (ans) => {
      const idx = parseInt(ans) - 1;
      if (idx >= 0 && idx < items.length) resolve(items[idx]);
      else resolve(null);
    });
  });
}

function ask(prompt: string): Promise<string> {
  process.stdout.write('\n' + prompt + '\n');
  return new Promise((resolve) => {
    rl.question('> ', (ans) => resolve(ans));
  });
}

async function runWizard() {
  process.stdout.write('\n--- Message Wizard ---\n');
  
  const destType = await selectFromList('Send to:', ['Server', 'User']);
  if (!destType) return;
  
  if (destType === 'Server') {
    const servers = await request('/api/servers');
    const serverNames = servers.map((s: any) => s.name);
    const serverName = await selectFromList('Select server:', serverNames);
    if (!serverName) return;
    
    const server = servers.find((s: any) => s.name === serverName);
    const channels = await request(`/api/channels?serverId=${server.id}`);
    const channelNames = channels.map((c: any) => c.name);
    const channelName = await selectFromList('Select channel:', channelNames);
    if (!channelName) return;
    
    const channel = channels.find((c: any) => c.name === channelName);
    const msg = await ask('Message:');
    if (!msg.trim()) return;
    
    const users = await request('/api/users');
    const userNames = users.map((u: any) => u.username);
    process.stdout.write('Available users: ' + userNames.join(', ') + '\n');
    
    const asUser = await ask('Send as (username):');
    if (!asUser.trim()) return;
    
    if (!userNames.map((n: string) => n.toLowerCase()).includes(asUser.toLowerCase())) {
      process.stdout.write('\nUser not found. Use one of: ' + userNames.join(', ') + '\n');
      return;
    }
    
    socket.emit('join-channel', channel.id);
    setTimeout(async () => {
      // Save via API
      const res = await fetch(`${API_URL}/api/messages/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: msg, channelId: channel.id, username: asUser }),
      });
      
      if (res.ok) {
        process.stdout.write(`\n✓ Sent to #${channelName}\n`);
      } else {
        const err = await res.json();
        process.stdout.write(`\nError: ${err.error}\n`);
      }
    }, 500);
  } else {
    const users = await request('/api/users');
    const userNames = users.map((u: any) => u.username);
    const toUser = await selectFromList('Select user:', userNames);
    if (!toUser) return;
    
    const user = users.find((u: any) => u.username === toUser);
    const msg = await ask('Message:');
    if (!msg.trim()) return;
    
    const asUser = await ask('Send as (username):');
    if (!asUser.trim()) return;
    
    socket.emit('send-dm', { content: msg, senderId: `guest-${Date.now()}`, recipientId: user.id });
    process.stdout.write(`\n✓ Sent to ${toUser}\n`);
  }
}

async function runCommand(cmd: string) {
  const c = cmd.trim().toLowerCase();

  if (c === 'server list' || c === 'servers') {
    const servers = await request('/api/servers');
    process.stdout.write('\nServers:\n');
    if (servers.length === 0) process.stdout.write('  (none)\n');
    servers.forEach((s: any) => process.stdout.write(`  ${s.id}  ${s.name}\n`));
  } else if (c.startsWith('server delete ')) {
    const name = cmd.trim().substring(13).trim();
    const servers = await request('/api/servers');
    const server = servers.find((s: any) => s.name.toLowerCase() === name.toLowerCase());
    if (!server) { process.stdout.write('\nServer not found\n'); return; }
    await fetch(`${API_URL}/api/servers/${server.id}/delete`, { method: 'DELETE' });
    process.stdout.write('\nServer deleted\n');
  } else if (c === 'user list' || c === 'users') {
    const users = await request('/api/users');
    process.stdout.write('\nUsers:\n');
    if (users.length === 0) process.stdout.write('  (none)\n');
    users.forEach((u) => process.stdout.write(`  ${u.id}  ${u.username}\n`));
  } else if (c.startsWith('user delete ')) {
    const name = cmd.trim().substring(11).trim();
    const users = await request('/api/users');
    const user = users.find((u: any) => u.username.toLowerCase() === name.toLowerCase());
    if (!user) { process.stdout.write('\nUser not found\n'); return; }
    await fetch(`${API_URL}/api/users/${user.id}/delete`, { method: 'DELETE' });
    process.stdout.write('\nUser deleted\n');
  } else if (c === 'message') {
    await runWizard();
  } else if (c === 'help') {
    process.stdout.write('\nCommands:\n  server list, server delete <name>\n  user list, user delete <name>\n  message (interactive)\n  exit\n');
  } else if (c === 'exit') {
    process.exit(0);
  } else if (c !== '') {
    process.stdout.write(`Unknown: ${c}\n`);
  }
}

process.stdout.write('Potato Chat CLI - Type "help" for commands\n');

rl.on('line', async (line) => {
  try { await runCommand(line); } catch (err) { process.stdout.write(`Error: ${err.message}\n`); }
  process.stdout.write('\n');
  rl.prompt();
});

rl.prompt();