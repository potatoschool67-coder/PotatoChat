#!/usr/bin/env node

import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

console.log('Connecting to socket server...\n');

socket.on('connect', () => {
  console.log('Connected! Testing real-time...\n');
  
  socket.emit('join-channel', 'test-channel');
  
  socket.on('new-message', (msg) => {
    console.log('Received:', msg);
  });

  console.log('Sending test message...');
  socket.emit('send-message', {
    content: 'Hello from CLI!',
    userId: 'test-user',
    channelId: 'test-channel',
  });

  setTimeout(() => {
    console.log('\nIf you see "Received:" above, real-time works!');
    socket.disconnect();
    process.exit(0);
  }, 2000);
});

socket.on('connect_error', (err) => {
  console.log('Error: ' + err.message);
  process.exit(1);
});