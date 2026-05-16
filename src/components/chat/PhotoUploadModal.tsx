'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, Link, ImageIcon } from 'lucide-react';

interface PhotoUploadModalProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

export default function PhotoUploadModal({ onSelect, onClose }: PhotoUploadModalProps) {
  const [tab, setTab] = useState<'upload' | 'url'>('upload');
  const [preview, setPreview] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [error, setError] = useState('');
  const [previewLoadFailed, setPreviewLoadFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE = 5 * 1024 * 1024;

  const extractUrl = (input: string): string => {
    const trimmed = input.trim();
    const srcMatch = trimmed.match(/src=["']([^"']+)["']/);
    if (srcMatch) return srcMatch[1];
    const mdMatch = trimmed.match(/!\[.*?\]\(([^)]+)\)/);
    if (mdMatch) return mdMatch[1];
    const bbMatch = trimmed.match(/\[img\]([^\[]+)\[\/img\]/);
    if (bbMatch) return bbMatch[1];
    return trimmed;
  };

  const handleFile = (file: File) => {
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('Image must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlPreview = () => {
    setError('');
    const url = extractUrl(urlInput);
    if (!url) {
      setError('Please enter a URL');
      return;
    }
    setPreview(url);
  };

  const handleDone = () => {
    if (!preview) {
      setError('No image selected');
      return;
    }
    onSelect(preview);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#2B2D31] rounded-lg shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Add Image</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-[#1f1f22] mb-4">
          <button
            onClick={() => setTab('upload')}
            className={`flex-1 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 ${tab === 'upload' ? 'text-white border-b-2 border-[#5865F2]' : 'text-gray-400 hover:text-white'}`}
          >
            <Upload size={14} /> Upload
          </button>
          <button
            onClick={() => setTab('url')}
            className={`flex-1 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 ${tab === 'url' ? 'text-white border-b-2 border-[#5865F2]' : 'text-gray-400 hover:text-white'}`}
          >
            <Link size={14} /> URL
          </button>
        </div>

        {tab === 'upload' && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#3f4147] rounded-lg p-8 text-center cursor-pointer hover:border-[#5865F2] transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            {preview && tab === 'upload' ? (
              <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded" />
            ) : (
              <div className="text-gray-400">
                <ImageIcon size={40} className="mx-auto mb-2" />
                <p className="text-sm">Click to upload an image</p>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF, WebP, SVG, AVIF</p>
              </div>
            )}
          </div>
        )}

        {tab === 'url' && (
          <div className="space-y-3">
            <input
              value={urlInput}
              onChange={(e) => {
                const val = e.target.value;
                setUrlInput(val);
                setPreviewLoadFailed(false);
                if (!val) {
                  setPreview(null);
                } else {
                  const extracted = extractUrl(val);
                  if (extracted !== val && extracted) {
                    setPreview(extracted);
                  }
                }
              }}
              placeholder="Paste image URL here..."
              className="w-full bg-[#1E1F22] text-gray-200 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#5865F2]"
            />
            {urlInput && (
              <button
                onClick={handleUrlPreview}
                className="w-full px-3 py-1.5 bg-[#383A40] hover:bg-[#3F4147] text-gray-300 text-sm rounded"
              >
                Preview
              </button>
            )}
            {preview && tab === 'url' && (
              <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded" onError={() => setPreviewLoadFailed(true)} />
            )}
          </div>
        )}


        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        {previewLoadFailed && tab === 'url' && <p className="text-yellow-400 text-xs mt-1">Preview unavailable — URL will still be sent</p>}

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-300 hover:text-white rounded">
            Cancel
          </button>
          <button
            onClick={handleDone}
            disabled={!preview}
            className="px-4 py-2 text-sm bg-[#5865F2] hover:bg-[#4752C4] text-white rounded disabled:opacity-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
