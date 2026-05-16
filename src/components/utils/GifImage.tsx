'use client';

import React, { useEffect, useRef, useState } from 'react';

interface GifImageProps {
  src: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
}

export default function GifImage({ src, alt = 'Image', className = '', onClick }: GifImageProps) {
  const isGif = src.toLowerCase().endsWith('.gif') || src.startsWith('data:image/gif');
  const [firstFrame, setFirstFrame] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!isGif) return;

    const isHttp = src.startsWith('http');
    const img = new window.Image();
    if (isHttp) img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!mountedRef.current) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        setFirstFrame(canvas.toDataURL('image/jpeg', 0.6));
      } catch {
        // CORS or other error — keep firstFrame null, placeholder will show
      }
    };
    img.onerror = () => {
      // loading failed — keep firstFrame null
    };
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, isGif]);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  if (!isGif) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        onClick={onClick}
      />
    );
  }

  return (
    <div
      className={`group relative overflow-hidden ${className}`}
      onClick={onClick}
    >
      <div className="group-hover:hidden">
        {firstFrame ? (
          <div className="relative">
            <img
              src={firstFrame}
              alt={alt}
              className="w-full rounded-lg"
            />
            <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
              <span className="px-2 py-1 bg-[#5865F2] rounded text-xs font-bold text-white tracking-wide">GIF</span>
              <span className="px-1.5 py-0.5 bg-[#5865F2] rounded text-[9px] font-semibold text-white">hover</span>
            </div>
          </div>
        ) : (
          <div className="w-full aspect-video bg-[#2b2d31] flex flex-col items-center justify-center gap-1 rounded-lg">
            <span className="px-2 py-1 bg-[#5865F2] rounded text-xs font-bold text-white tracking-wide animate-pulse">GIF</span>
            <span className="px-1.5 py-0.5 bg-[#5865F2] rounded text-[9px] font-semibold text-white">hover</span>
          </div>
        )}
      </div>
      <img
        src={src}
        alt={alt}
        className="w-full rounded-lg cursor-pointer hidden group-hover:block"
      />
    </div>
  );
}
