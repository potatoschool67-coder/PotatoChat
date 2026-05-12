'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    const loginAs = localStorage.getItem('loginAs');
    if (loginAs) {
      setUsername(loginAs);
      localStorage.removeItem('loginAs');
    }
    
    // Check if already logged in via cookie
    if (document.cookie.includes('auth-token=')) {
      router.push('/');
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (res.ok) {
      login(data.user);
      router.push('/');
    } else {
      setError(data.error || 'Something went wrong');
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#313338] text-white">
      <div className="w-full max-w-md p-8 bg-[#2B2D31] rounded-lg shadow-xl">
        <h1 className="text-2xl font-bold text-center mb-6">Welcome back!</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Username</label>
            <input
              className="p-2 bg-[#1E1F22] rounded outline-none focus:ring-2 ring-indigo-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Password</label>
            <input
              type="password"
              className="p-2 bg-[#1E1F22] rounded outline-none focus:ring-2 ring-indigo-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button className="bg-[#5865F2] hover:bg-[#4752C4] py-2 rounded font-medium transition-colors mt-2">
            Login
          </button>
        </form>
        <p className="text-sm text-gray-400 mt-4 text-center">
          Need an account? <Link href="/register" className="text-[#00A8FC] hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}