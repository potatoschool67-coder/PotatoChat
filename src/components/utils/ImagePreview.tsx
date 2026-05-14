'use client';

import { X } from 'lucide-react';

interface ImagePreviewProps {
  imageUrl: string | null;
  onRemove: () => void;
}

export default function ImagePreview({ imageUrl, onRemove }: ImagePreviewProps) {
  if (!imageUrl) return null;

  return (
    <div className="relative mb-2 rounded-lg overflow-hidden border border-[#3f4147] bg-[#2b2d31]">
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 z-10 p-1 bg-black/50 rounded-full hover:bg-black/70 text-white"
      >
        <X size={16} />
      </button>
      <img
        src={imageUrl}
        alt="Preview"
        className="max-h-32 w-auto mx-auto"
        onError={onRemove}
      />
    </div>
  );
}