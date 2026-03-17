"use client";

import { useState } from "react";
import { type Address } from "viem";
import { useVote, ProposalState } from "@/hooks/useGovernance";

interface VoteModalProps {
  proposalId: bigint;
  description: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function VoteModal({ proposalId, description, onClose, onSuccess }: VoteModalProps) {
  const { castVote, isLoading, error } = useVote(proposalId);
  const [reason, setReason] = useState("");

  const handleVote = async (support: 0 | 1 | 2) => {
    await castVote(support, reason || undefined);
    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Cast Vote</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <p className="text-sm text-gray-400 mb-4">{description}</p>

        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">Reason (optional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you voting this way?"
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => handleVote(1)}
            disabled={isLoading}
            className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            For
          </button>
          <button
            onClick={() => handleVote(0)}
            disabled={isLoading}
            className="bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            Against
          </button>
          <button
            onClick={() => handleVote(2)}
            disabled={isLoading}
            className="bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            Abstain
          </button>
        </div>

        {error && <p className="text-red-400 text-sm text-center mt-3">{error.message}</p>}
      </div>
    </div>
  );
}
