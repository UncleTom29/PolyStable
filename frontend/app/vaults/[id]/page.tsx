"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AppShell,
  DataRow,
  EmptyState,
  MetricCard,
  SectionCard,
  StatusPill,
} from "@/components/shared/AppShell";
import { VaultHealthBar } from "@/components/vault/VaultHealthBar";
import { useVault } from "@/hooks/useVault";
import { formatAddress, formatRatio, formatTokenAmount } from "@/lib/utils";

export default function VaultDetailPage() {
  const params  = useParams<{ id: string }>();
  const vaultId = BigInt(params.id ?? "0");
  const { vault, ratio, status, isLoading } = useVault(vaultId);

  if (isLoading) {
    return (
      <AppShell title={`Vault #${vaultId}`} subtitle="Loading position data…" eyebrow="Vault detail">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[0,1,2,3].map((i) => (
            <div key={i} className="card rounded-card p-5 space-y-3">
              <div className="skeleton h-3 w-1/2 rounded" />
              <div className="skeleton h-7 w-3/4 rounded" />
            </div>
          ))}
        </div>
        <div className="card rounded-card2 p-6 space-y-4">
          <div className="skeleton h-4 w-1/3 rounded" />
          <div className="skeleton h-2.5 w-full rounded-full" />
          <div className="skeleton h-2.5 w-full rounded-full" />
        </div>
      </AppShell>
    );
  }

  if (!vault || vault.owner === "0x0000000000000000000000000000000000000000") {
    return (
      <AppShell title={`Vault #${vaultId}`} subtitle="Vault not found." eyebrow="Vault detail">
        <EmptyState
          title="Vault not found"
          description="This vault does not exist on the connected network, or its data could not be resolved."
          action={<Link href="/dashboard" className="btn btn-primary text-sm">Back to Dashboard</Link>}
        />
      </AppShell>
    );
  }

  const tone       = status === "safe" ? "success" : status === "warning" ? "warning" : "danger";
  const collLabel  = vault.collateral === "0x0000000000000000000000000000000000000000" ? "DOT" : formatAddress(vault.collateral);

  const DISABLED_ACTIONS = [
    "Deposit more collateral",
    "Withdraw collateral",
    "Mint additional pUSD",
    "Repay outstanding debt",
  ];

  return (
    <AppShell
      title={`Vault #${vaultId}`}
      subtitle="Position health, collateral details, and planned management actions."
      eyebrow="Vault detail"
      actions={
        <>
          <Link href="/dashboard" className="btn btn-ghost text-sm">← Dashboard</Link>
          <Link href="/vaults"    className="btn btn-primary text-sm">Open Another</Link>
        </>
      }
    >
      {/* Status badge */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusPill tone={tone} dot>{status}</StatusPill>
        {status === "danger" && (
          <p className="text-xs text-rose font-data">
            ⚠ Below safe threshold — consider adding collateral or repaying debt.
          </p>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Owner"            value={formatAddress(vault.owner)}                hint="Vault controller"     accent="brand" />
        <MetricCard label="Collateral"       value={`${formatTokenAmount(vault.lockedAmount)} ${collLabel}`} hint="Locked position"   accent="teal"  />
        <MetricCard label="Debt"             value={`${formatTokenAmount(vault.debt)} pUSD`}  hint="Outstanding borrow"  accent="amber" />
        <MetricCard label="Collateral ratio" value={ratio ? formatRatio(ratio) : "—"}          hint="Current health"      accent={tone === "success" ? "green" : tone === "warning" ? "amber" : "rose"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Position health */}
        <SectionCard title="Position health" description="Live ratio bar and position details for this vault.">
          <div className="space-y-5">
            {ratio && <VaultHealthBar ratio={ratio} />}

            <div className="divider" />

            <DataRow label="Last accrual"     value={vault.lastAccrual.toString()} mono />
            <DataRow label="Collateral type"  value={collLabel} mono />
            <DataRow label="Vault ID"         value={`#${vaultId.toString()}`} mono />
            <DataRow label="Owner"            value={vault.owner} mono />

            <div className="card-ghost rounded-xl p-4">
              <p className="text-xs text-muted leading-relaxed">
                <span className="text-amber font-semibold">Note:</span> Vault management actions (deposit, withdraw, mint, repay) are shown below but disabled pending full transaction flow implementation.
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Management actions */}
        <SectionCard title="Vault management" description="Controls coming in the next iteration — shown for UX preview.">
          <div className="space-y-2.5">
            {DISABLED_ACTIONS.map((action) => (
              <button
                key={action}
                type="button"
                disabled
                className="w-full flex items-center gap-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-3.5 text-left text-sm text-dim cursor-not-allowed"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-dim/50 shrink-0" />
                {action}
                <span className="ml-auto text-[10px] font-data text-dim tracking-wider uppercase">Soon</span>
              </button>
            ))}
          </div>

          <div className="mt-5 pt-5 border-t border-[rgba(255,255,255,0.07)]">
            <p className="text-xs text-dim leading-relaxed">
              These controls will trigger on-chain transactions once the management UX is complete. The current view focuses on health monitoring and risk assessment.
            </p>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
