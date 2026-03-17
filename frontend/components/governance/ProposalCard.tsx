"use client";

import { useState } from "react";
import { type Address } from "viem";
import { useVote, ProposalState } from "@/hooks/useGovernance";
import { formatAddress } from "@/lib/utils";

interface ProposalCardProps {
  id: bigint;
  proposer: Address;
  description: string;
  state: ProposalState;
  voteStart: bigint;
  voteEnd: bigint;
}

const STATE_LABELS: Record<number, string> = {
  [ProposalState.Pending]: "Pending",
  [ProposalState.Active]: "Active",
  [ProposalState.Canceled]: "Canceled",
  [ProposalState.Defeated]: "Defeated",
  [ProposalState.Succeeded]: "Succeeded",
  [ProposalState.Queued]: "Queued",
  [ProposalState.Expired]: "Expired",
  [ProposalState.Executed]: "Executed",
};

const STATE_COLORS: Record<number, string> = {
  [ProposalState.Active]: "bg-green-900 text-green-300",
  [ProposalState.Succeeded]: "bg-blue-900 text-blue-300",
  [ProposalState.Queued]: "bg-yellow-900 text-yellow-300",
  [ProposalState.Executed]: "bg-purple-900 text-purple-300",
  [ProposalState.Defeated]: "bg-red-900 text-red-300",
};

export function ProposalCard({
  id,
  proposer,
  description,
  state,
  voteStart,
  voteEnd,
}: ProposalCardProps) {
  const { castVote, isLoading } = useVote(id);
  const [voted, setVoted] = useState(false);

  const handleVote = async (support: 0 | 1 | 2) => {
    await castVote(support);
    setVoted(true);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 mr-4">
          <h3 className="font-medium text-sm mb-1">{description}</h3>
          <p className="text-xs text-gray-500">
            By {formatAddress(proposer)} · Blocks {voteStart.toString()}–{voteEnd.toString()}
          </p>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full shrink-0 ${
            STATE_COLORS[state] ?? "bg-gray-700 text-gray-400"
          }`}
        >
          {STATE_LABELS[state] ?? "Unknown"}
        </span>
      </div>

      {state === ProposalState.Active && !voted && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => handleVote(1)}
            disabled={isLoading}
            className="flex-1 bg-green-900 hover:bg-green-800 text-green-300 text-xs py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            For
          </button>
          <button
            onClick={() => handleVote(0)}
            disabled={isLoading}
            className="flex-1 bg-red-900 hover:bg-red-800 text-red-300 text-xs py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            Against
          </button>
          <button
            onClick={() => handleVote(2)}
            disabled={isLoading}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            Abstain
          </button>
        </div>
      )}

      {voted && (
        <p className="text-xs text-green-400 mt-2">✅ Vote submitted</p>
      )}
    </div>
  );
}
