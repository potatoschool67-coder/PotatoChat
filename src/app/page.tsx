'use client';

import React from 'react';
import { redirect } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Page() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-full flex items-center justify-center text-white">Loading...</div>;
  }

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="h-full flex flex-col items-center justify-center text-white">
      <h1 className="text-4xl font-bold mb-4">Welcome to Potato Chat</h1>
      <p className="text-gray-400 mb-8">Select a server from the sidebar to start chatting!</p>
      <div className="bg-[#2B2D31] p-6 rounded-lg shadow-lg max-w-md text-center">
        <p className="text-sm text-gray-300">
          You are logged in as <span className="font-bold text-white">{user.username}</span>.
          Explore your servers and channels to connect with others.
        </p>
      </div>
    </div>
  );
}
