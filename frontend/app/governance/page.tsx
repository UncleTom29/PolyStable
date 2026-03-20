"use client";

import { useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { type Address } from "viem";
import {
  AppShell,
  EmptyState,
  LoadingRows,
  MetricCard,
  SectionCard,
  StatusPill,
  WalletGate,
} from "@/components/shared/AppShell";
import { Callout } from "@/components/shared/Callout";
import { FormField } from "@/components/shared/FormField";
import { ProposalCard } from "@/components/governance/ProposalCard";
import {
  ProposalState,
  useCreateProposal,
  useDelegate,
  useDelegatee,
  useProposals,
  useVotingPower,
} from "@/hooks/useGovernance";
import { governorConfig } from "@/lib/contracts";
import { formatAddress, formatTokenAmount } from "@/lib/utils";

export default function GovernancePage() {
  const { address, isConnected } = useAccount();
  const { proposals, isLoading }          = useProposals();
  const { delegate, isLoading: delegateLoading, error: delegateError } = useDelegate();
  const { createDebtCeilingProposal, isLoading: proposalLoading, error: proposalError } = useCreateProposal();
  const { data: votingPower }   = useVotingPower(address);
  const { data: currentDelegatee } = useDelegatee(address);
  const [delegatee, setDelegatee] = useState("");
  const [newCeiling, setNewCeiling] = useState("20000000");

  const { data: proposalStates } = useReadContracts({
    contracts: proposals.map((p) => ({ ...governorConfig, functionName: "state", args: [p.id] })),
    query: { enabled: proposals.length > 0 },
  });

  if (!isConnected) {
    return (
      <AppShell title="Governance" subtitle="Delegate voting power, draft proposals, and track live decisions." eyebrow="pGOV">
        <WalletGate
          title="Connect to participate"
          description="Wallet connection lets you delegate voting power, propose parameter changes, and cast votes."
          note="Governance actions"
        />
      </AppShell>
    );
  }

  const activeCount = (proposalStates ?? proposals.map((p) => ({ result: p.state })))
    .filter((r) => Number(r.result) === ProposalState.Active)
    .length;

  const handleDelegate   = async () => delegate((delegatee || address) as Address);
  const handleProposal   = async () => {
    if (!newCeiling) return;
    await createDebtCeilingProposal(BigInt(newCeiling) * 10n ** 18n);
  };

  const delegateeDisplay =
    currentDelegatee && currentDelegatee !== "0x0000000000000000000000000000000000000000"
      ? formatAddress(currentDelegatee)
      : "Self";

  return (
    <AppShell
      title="Governance"
      subtitle="Delegate, propose, and vote on protocol parameter changes."
      eyebrow="pGOV control room"
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Voting power"   value={formatTokenAmount((votingPower as bigint | undefined) ?? 0n)} hint="Delegated to you"           accent="brand"  />
        <MetricCard label="Delegated to"   value={delegateeDisplay}                                              hint="Current vote target"         accent="teal"   />
        <MetricCard label="Total proposals" value={isLoading ? "…" : proposals.length.toLocaleString()}          hint="On-chain proposals observed" accent="amber"  />
        <MetricCard label="Active now"     value={isLoading ? "…" : activeCount.toLocaleString()}               hint="Requires voter attention"    accent="green"  />
      </div>

      {/* Controls */}
      <div className="grid gap-5 lg:grid-cols-2 mb-8">
        {/* Delegate */}
        <SectionCard title="Delegate voting power" description="Enter an address or leave blank to self-delegate with this wallet.">
          <div className="space-y-4">
            <FormField label="Delegatee address" htmlFor="delegatee" hint="Leave blank to delegate to yourself">
              <input
                id="delegatee"
                type="text"
                value={delegatee}
                onChange={(e) => setDelegatee(e.target.value)}
                placeholder={address ?? "0x…"}
                className="input input-mono"
              />
            </FormField>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={handleDelegate}
                disabled={delegateLoading}
                className="btn btn-primary w-full sm:w-auto"
              >
                {delegateLoading ? "Delegating…" : "Delegate"}
              </button>
              <button
                type="button"
                onClick={() => setDelegatee(address ?? "")}
                className="btn btn-secondary w-full sm:w-auto"
              >
                Use My Address
              </button>
            </div>

            {delegateError && <Callout tone="error">{delegateError.message}</Callout>}
          </div>
        </SectionCard>

        {/* Create proposal */}
        <SectionCard title="Create debt ceiling proposal" description="Submit a governance action to update the DOT collateral debt ceiling.">
          <div className="space-y-4">
            <FormField label="New DOT debt ceiling" htmlFor="new-ceiling" hint="Denomination in whole pUSD units">
              <div className="relative">
                <input
                  id="new-ceiling"
                  type="number"
                  value={newCeiling}
                  onChange={(e) => setNewCeiling(e.target.value)}
                  placeholder="20000000"
                  className="input pr-16"
                />
                <span className="absolute inset-y-0 right-4 flex items-center text-sm font-data font-semibold text-muted pointer-events-none">
                  pUSD
                </span>
              </div>
            </FormField>

            <Callout tone="info">
              Submits a governance call to update the DOT collateral debt ceiling. The narrow scope makes proposals easier to review and ratify.
            </Callout>

            <button
              type="button"
              onClick={handleProposal}
              disabled={proposalLoading || !newCeiling}
              className="btn btn-primary"
            >
              {proposalLoading ? "Submitting…" : "Create Proposal"}
            </button>

            {proposalError && <Callout tone="error">{proposalError.message}</Callout>}
          </div>
        </SectionCard>
      </div>

      {/* Proposal feed */}
      <SectionCard
        title="Proposal feed"
        description="All on-chain proposals with live status and voting controls."
        action={
          <StatusPill tone="info" dot>
            {isLoading ? "syncing" : `${proposals.length} loaded`}
          </StatusPill>
        }
      >
        {isLoading ? (
          <LoadingRows count={2} />
        ) : proposals.length === 0 ? (
          <EmptyState
            title="No proposals yet"
            description="As governance proposals appear on-chain, they'll show up here with status and voting controls."
          />
        ) : (
          <div className="space-y-4">
            {proposals.map((proposal) => (
              <ProposalCard key={proposal.id.toString()} proposal={proposal} />
            ))}
          </div>
        )}
      </SectionCard>
    </AppShell>
  );
}
