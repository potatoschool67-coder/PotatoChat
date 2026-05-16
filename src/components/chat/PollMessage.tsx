'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import PollResults from './PollResults';

interface PollOption {
  id: string;
  text: string;
  count: number;
  voted: boolean;
}

interface PollData {
  id: string;
  question: string;
  options: PollOption[];
}

interface PollMessageProps {
  poll: PollData;
  pollId: string;
}

export default function PollMessage({ poll, pollId }: PollMessageProps) {
  const [options, setOptions] = useState(poll.options);
  const [totalVotes, setTotalVotes] = useState(poll.options.reduce((s, o) => s + o.count, 0));
  const [voting, setVoting] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    setOptions((prev) => {
      const updated = prev.map((opt) => {
        const serverOpt = poll.options.find((o) => o.id === opt.id);
        return serverOpt ? { ...opt, count: serverOpt.count } : opt;
      });
      setTotalVotes(updated.reduce((s, o) => s + o.count, 0));
      return updated;
    });
  }, [poll]);

  const handleVote = async (optionId: string) => {
    setVoting(true);
    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId }),
      });

      if (res.ok) {
        const data = await res.json();
        setOptions((prev) => {
          const newOptions = prev.map((opt) => {
            if (data.action === 'removed') {
              return {
                ...opt,
                count: opt.id === optionId ? Math.max(0, opt.count - 1) : opt.count,
                voted: false,
              };
            }
            const wasVoted = opt.voted;
            if (opt.id === optionId) {
              return { ...opt, count: opt.count + 1, voted: true };
            }
            if (wasVoted) {
              return { ...opt, count: Math.max(0, opt.count - 1), voted: false };
            }
            return opt;
          });
          setTotalVotes(newOptions.reduce((s, o) => s + o.count, 0));
          return newOptions;
        });
      }
    } catch {
      // silent
    } finally {
      setVoting(false);
    }
  };

  return (
    <>
      <div className="mt-2 bg-[#2B2D31] rounded-lg p-3 border border-[#1E1F22] max-w-md">
        <p className="text-gray-200 font-medium mb-2">{poll.question}</p>
        <div className="space-y-1.5">
          {options.map((option) => {
            const pct = totalVotes > 0 ? Math.round((option.count / totalVotes) * 100) : 0;
            return (
              <button
                key={option.id}
                onClick={() => handleVote(option.id)}
                disabled={voting}
                className={`w-full text-left relative overflow-hidden rounded px-3 py-2 transition-colors ${
                  option.voted
                    ? 'bg-[#5865F2]/20 border border-[#5865F2]/50'
                    : 'bg-[#1E1F22] hover:bg-[#383A40] border border-transparent'
                }`}
              >
                <div
                  className="absolute inset-0 bg-[#5865F2]/10 transition-all"
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between">
                  <span className="text-sm text-gray-200">{option.text}</span>
                  <span className="text-xs text-gray-400 ml-2">{option.count} ({pct}%)</span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
          <button
            onClick={() => setShowResults(true)}
            className="flex items-center gap-1 text-xs text-[#5865F2] hover:text-[#4752C4]"
          >
            <BarChart3 size={12} /> See who voted
          </button>
        </div>
      </div>
      {showResults && (
        <PollResults
          pollId={pollId}
          onClose={() => setShowResults(false)}
        />
      )}
    </>
  );
}
