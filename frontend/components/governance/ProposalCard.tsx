"use client";

import { StatusPill } from "@/components/shared/AppShell";
import { ProposalState, useProposalState, useProposals, useVote } from "@/hooks/useGovernance";
import { PROPOSAL_STATE_LABELS, PROPOSAL_STATE_TONES } from "@/lib/constants";
import { formatAddress } from "@/lib/utils";

interface ProposalCardProps {
  proposal: ReturnType<typeof useProposals>["proposals"][0];
}

export function ProposalCard({ proposal }: ProposalCardProps) {
  const { data: liveState } = useProposalState(proposal.id);
  const { castVote, isLoading } = useVote(proposal.id);

  const state   = Number(liveState ?? proposal.state);
  const tone    = (PROPOSAL_STATE_TONES[state] ?? "neutral") as "success" | "warning" | "danger" | "neutral" | "info";
  const isActive = state === ProposalState.Active;

  return (
    <div className="card rounded-card2 overflow-hidden">
      {/* Top accent bar for active proposals */}
      {isActive && <div className="h-[2px] w-full bg-emerald" />}

      <div className="p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={tone} dot>
                {PROPOSAL_STATE_LABELS[state] ?? "Unknown"}
              </StatusPill>
              <span className="text-[11px] font-data text-dim tracking-wider">
                #{proposal.id.toString().slice(0, 10)}…
              </span>
            </div>
            <h3 className="font-display font-bold text-ink text-xl leading-snug">
              {proposal.description || "Untitled Proposal"}
            </h3>
            <p className="text-xs text-muted font-data">
              by {formatAddress(proposal.proposer)}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Targets",    value: proposal.targets.length.toString() },
            { label: "Vote Start", value: proposal.voteStart.toString() },
            { label: "Vote End",   value: proposal.voteEnd.toString() },
          ].map(({ label, value }) => (
            <div key={label} className="card-ghost rounded-xl p-3">
              <p className="text-[10px] font-data text-dim tracking-wider uppercase mb-1">{label}</p>
              <p className="font-data text-sm font-semibold text-ink truncate">{value}</p>
            </div>
          ))}
        </div>

        {/* Voting actions */}
        {isActive ? (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => castVote(1)}
              disabled={isLoading}
              className="btn btn-success-ghost disabled:opacity-40"
            >
              {isLoading ? "…" : "✓ For"}
            </button>
            <button
              type="button"
              onClick={() => castVote(0)}
              disabled={isLoading}
              className="btn btn-danger disabled:opacity-40"
            >
              ✕ Against
            </button>
            <button
              type="button"
              onClick={() => castVote(2)}
              disabled={isLoading}
              className="btn btn-ghost disabled:opacity-40"
            >
              — Abstain
            </button>
          </div>
        ) : (
          <p className="text-xs text-dim italic">
            Voting is only available while this proposal is active.
          </p>
        )}
      </div>
    </div>
  );
}
