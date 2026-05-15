'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Avatar from '@/components/utils/Avatar';

interface Voter {
  id: string;
  username: string;
  avatar: string | null;
}

interface OptionResult {
  id: string;
  text: string;
  voters: Voter[];
}

interface PollResultsData {
  id: string;
  question: string;
  options: OptionResult[];
}

interface PollResultsProps {
  pollId: string;
  onClose: () => void;
}

export default function PollResults({ pollId, onClose }: PollResultsProps) {
  const [data, setData] = useState<PollResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchResults() {
      try {
        const res = await fetch(`/api/polls/${pollId}/results`);
        if (res.ok) {
          const d = await res.json();
          setData(d);
        } else {
          setError('Failed to load results');
        }
      } catch {
        setError('Failed to load results');
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, [pollId]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#2B2D31] rounded-lg shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Poll Results</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {loading && (
          <p className="text-gray-400 text-sm">Loading results...</p>
        )}

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        {data && (
          <div className="space-y-4">
            <p className="text-gray-200 font-medium">{data.question}</p>
            {data.options.map((option) => (
              <div key={option.id}>
                <p className="text-sm text-gray-300 mb-2">{option.text} — {option.voters.length} vote{option.voters.length !== 1 ? 's' : ''}</p>
                {option.voters.length > 0 && (
                  <div className="space-y-1 ml-2">
                    {option.voters.map((voter) => (
                      <div key={voter.id} className="flex items-center gap-2">
                        <Avatar src={voter.avatar} name={voter.username} size={24} />
                        <span className="text-sm text-gray-300">{voter.username}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
