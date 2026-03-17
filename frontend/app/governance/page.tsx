"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useProposals, useVote, useDelegate, useCreateProposal, ProposalState } from "@/hooks/useGovernance";
import { type Address } from "viem";

const PROPOSAL_STATE_LABELS: Record<number, string> = {
  [ProposalState.Pending]: "Pending",
  [ProposalState.Active]: "Active",
  [ProposalState.Canceled]: "Canceled",
  [ProposalState.Defeated]: "Defeated",
  [ProposalState.Succeeded]: "Succeeded",
  [ProposalState.Queued]: "Queued",
  [ProposalState.Expired]: "Expired",
  [ProposalState.Executed]: "Executed",
};

const PROPOSAL_STATE_COLORS: Record<number, string> = {
  [ProposalState.Pending]: "bg-gray-700 text-gray-300",
  [ProposalState.Active]: "bg-green-900 text-green-300",
  [ProposalState.Canceled]: "bg-gray-700 text-gray-500",
  [ProposalState.Defeated]: "bg-red-900 text-red-300",
  [ProposalState.Succeeded]: "bg-blue-900 text-blue-300",
  [ProposalState.Queued]: "bg-yellow-900 text-yellow-300",
  [ProposalState.Expired]: "bg-gray-700 text-gray-500",
  [ProposalState.Executed]: "bg-purple-900 text-purple-300",
};

function ProposalCard({ proposal }: { proposal: ReturnType<typeof useProposals>["proposals"][0] }) {
  const [showVoteModal, setShowVoteModal] = useState(false);
  const { castVote, isLoading: voteLoading } = useVote(proposal.id);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-sm text-gray-300 max-w-xs">{proposal.description}</h3>
        <span className={`text-xs px-2 py-1 rounded-full ${PROPOSAL_STATE_COLORS[proposal.state] ?? "bg-gray-700 text-gray-400"}`}>
          {PROPOSAL_STATE_LABELS[proposal.state] ?? "Unknown"}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-4 font-mono">
        Proposer: {proposal.proposer.slice(0, 8)}…{proposal.proposer.slice(-6)}
      </p>

      {proposal.state === ProposalState.Active && (
        <div className="flex gap-2">
          <button
            onClick={() => castVote(1)}
            disabled={voteLoading}
            className="flex-1 bg-green-900 hover:bg-green-800 text-green-300 text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            For
          </button>
          <button
            onClick={() => castVote(0)}
            disabled={voteLoading}
            className="flex-1 bg-red-900 hover:bg-red-800 text-red-300 text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            Against
          </button>
          <button
            onClick={() => castVote(2)}
            disabled={voteLoading}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            Abstain
          </button>
        </div>
      )}
    </div>
  );
}

export default function GovernancePage() {
  const { address, isConnected } = useAccount();
  const { proposals, isLoading } = useProposals();
  const { delegate, isLoading: delegateLoading } = useDelegate();
  const { createDebtCeilingProposal, isLoading: proposalLoading } = useCreateProposal();
  const [delegatee, setDelegatee] = useState("");
  const [newCeiling, setNewCeiling] = useState("20000000");

  if (!isConnected) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-bold">Connect your wallet</h1>
        <ConnectButton />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <a href="/" className="text-xl font-bold text-pink-500">PolyStable</a>
        <ConnectButton />
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-8">Governance</h1>

        {/* Delegation */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Delegate Voting Power</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={delegatee}
              onChange={(e) => setDelegatee(e.target.value)}
              placeholder={address ?? "0x..."}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500 font-mono"
            />
            <button
              onClick={() => delegate((delegatee || address) as Address)}
              disabled={delegateLoading}
              className="bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white px-5 py-3 rounded-lg text-sm font-medium transition-colors"
            >
              {delegateLoading ? "Delegating…" : "Delegate"}
            </button>
          </div>
        </div>

        {/* Create Proposal */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Create Proposal: Update DOT Debt Ceiling</h2>
          <div className="flex gap-3">
            <input
              type="number"
              value={newCeiling}
              onChange={(e) => setNewCeiling(e.target.value)}
              placeholder="20000000"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500"
            />
            <span className="flex items-center text-gray-400 text-sm">pUSD</span>
            <button
              onClick={() => createDebtCeilingProposal(BigInt(newCeiling) * 10n ** 18n)}
              disabled={proposalLoading}
              className="bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white px-5 py-3 rounded-lg text-sm font-medium transition-colors"
            >
              {proposalLoading ? "Proposing…" : "Propose"}
            </button>
          </div>
        </div>

        {/* Proposals */}
        <h2 className="text-xl font-semibold mb-4">Active Proposals</h2>
        {isLoading ? (
          <div className="text-gray-400">Loading proposals…</div>
        ) : proposals.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-400">
            No proposals yet
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map((p) => (
              <ProposalCard key={p.id.toString()} proposal={p} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
