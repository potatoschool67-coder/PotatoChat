'use client';

import React from 'react';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: number;
  className?: string;
}

export default function Avatar({ src, name = '', size = 40, className = '' }: AvatarProps) {
  const initial = name.charAt(0).toUpperCase();
  
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center bg-gray-500 text-white font-medium ${className}`}
      style={{ width: size, height: size }}
    >
      {initial}
    </div>
  );
}