"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { VaultSummaryCard } from "@/components/dashboard/VaultSummaryCard";
import {
  AppShell,
  EmptyState,
  LoadingRows,
  MetricCard,
  SectionCard,
  StatusPill,
  WalletGate,
  DataRow,
} from "@/components/shared/AppShell";
import { useProtocolStats } from "@/hooks/useProtocolStats";
import { useUserVaults } from "@/hooks/useVault";
import { formatTokenAmount } from "@/lib/utils";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { vaultIds, isLoading: vaultsLoading } = useUserVaults(address);
  const stats = useProtocolStats();

  if (!isConnected) {
    return (
      <AppShell
        title="Dashboard"
        subtitle="Monitor protocol health and your vault positions at a glance."
        eyebrow="Overview"
      >
        <WalletGate
          title="Connect your wallet"
          description="Wallet connection unlocks your vault list, transaction history, and governance participation."
          note="Polkadot Hub Testnet"
        />
      </AppShell>
    );
  }

  const metrics = [
    { label: "Total pUSD",     value: stats.isLoading ? "…" : `${formatTokenAmount(stats.totalPUSDSupply)} pUSD`, hint: "Protocol-wide issuance", accent: "brand" as const },
    { label: "Active Vaults",  value: stats.isLoading ? "…" : stats.totalVaults.toLocaleString(),                  hint: "Open collateral positions", accent: "teal" as const },
    { label: "Surplus Buffer", value: stats.isLoading ? "…" : `${formatTokenAmount(stats.surplusBalance)} DOT`,    hint: "System-owned backstop",    accent: "amber" as const },
    { label: "System Health",  value: stats.isLoading || stats.systemDebt === 0n ? "∞" : `${formatTokenAmount(stats.systemHealth, 18, 2)}×`, hint: "Buffer / debt ratio", accent: "green" as const },
  ];

  return (
    <AppShell
      title="Dashboard"
      subtitle="Protocol snapshot and your open positions."
      eyebrow="Overview"
      actions={
        <>
          <Link href="/vaults"     className="btn btn-primary  text-sm">Open New Vault</Link>
          <Link href="/governance" className="btn btn-secondary text-sm">Governance</Link>
        </>
      }
    >
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} loading={stats.isLoading} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        {/* Vault list */}
        <SectionCard
          title="Your Vaults"
          description="All open collateral positions for this wallet."
          action={
            <StatusPill tone="info" dot>
              {vaultsLoading ? "syncing" : `${vaultIds.length} vault${vaultIds.length !== 1 ? "s" : ""}`}
            </StatusPill>
          }
        >
          {vaultsLoading ? (
            <LoadingRows count={2} />
          ) : vaultIds.length === 0 ? (
            <EmptyState
              title="No vaults yet"
              description="Deposit DOT collateral to open your first vault and start minting pUSD."
              action={
                <Link href="/vaults" className="btn btn-primary text-sm">
                  Open Your First Vault
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4">
              {vaultIds.map((id) => (
                <VaultSummaryCard key={id.toString()} vaultId={id} />
              ))}
            </div>
          )}
        </SectionCard>

        {/* Side panel */}
        <div className="space-y-5">
          <SectionCard title="Protocol state" description="Key metrics updated every 15s.">
            <DataRow label="Min collateral ratio" value="150%" />
            <DataRow label="Safe target ratio"    value="175%+" />
            <DataRow label="Governance token"     value="pGOV" />
            <DataRow label="Network"              value="Polkadot Hub Testnet" />
          </SectionCard>

          <SectionCard title="Quick actions">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <Link href="/vaults"       className="btn btn-secondary text-sm w-full">New Vault</Link>
              <Link href="/liquidations" className="btn btn-secondary text-sm w-full">Liquidations</Link>
              <Link href="/governance"   className="btn btn-secondary text-sm w-full">Governance</Link>
              <Link href="/"             className="btn btn-ghost     text-sm w-full">Home</Link>
            </div>
          </SectionCard>

          <SectionCard title="Best practices">
            <div className="space-y-3">
              {[
                { title: "Stay above 175%",    body: "The 150% minimum is a hard floor. Healthy vaults target meaningfully higher." },
                { title: "Watch the buffer",   body: "A growing surplus indicates protocol health; a falling one signals increased risk." },
                { title: "Vote on proposals",  body: "Parameters can change. Staying engaged in governance protects your position." },
              ].map((item) => (
                <div key={item.title} className="card-ghost rounded-xl p-4">
                  <p className="text-sm font-semibold text-ink mb-1">{item.title}</p>
                  <p className="text-xs text-muted leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
