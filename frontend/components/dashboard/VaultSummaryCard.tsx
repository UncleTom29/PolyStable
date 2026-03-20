"use client";

import Link from "next/link";
import { StatusPill } from "@/components/shared/AppShell";
import { VaultHealthBar } from "@/components/vault/VaultHealthBar";
import { useVault } from "@/hooks/useVault";
import { formatAddress, formatRatio, formatTokenAmount } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface VaultSummaryCardProps {
  vaultId: bigint;
}

export function VaultSummaryCard({ vaultId }: VaultSummaryCardProps) {
  const { vault, ratio, status, isLoading } = useVault(vaultId);

  if (isLoading || !vault || ratio === undefined) {
    return (
      <div className="card rounded-card2 p-5 space-y-3 animate-pulse">
        <div className="skeleton h-3.5 w-24 rounded" />
        <div className="skeleton h-6 w-1/2 rounded" />
        <div className="skeleton h-2 w-full rounded-full" />
      </div>
    );
  }

  const tone = status === "safe" ? "success" : status === "warning" ? "warning" : "danger";
  const collLabel =
    vault.collateral === "0x0000000000000000000000000000000000000000" ? "DOT" : "ERC20";

  return (
    <div className={cn(
      "card rounded-card2 p-5 sm:p-6 transition-all hover:border-[rgba(255,255,255,0.12)]",
      status === "danger" && "border-rose/20"
    )}>
      {/* Top row */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <p className="text-[11px] font-data text-dim tracking-[0.15em] uppercase mb-1.5">
            Vault #{vaultId.toString()}
          </p>
          <p className="text-xs text-muted font-data">{formatAddress(vault.owner)}</p>
        </div>
        <StatusPill tone={tone} dot>{status}</StatusPill>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Collateral", value: `${formatTokenAmount(vault.lockedAmount)}`, unit: collLabel },
          { label: "Debt",       value: `${formatTokenAmount(vault.debt)}`,         unit: "pUSD" },
          { label: "Ratio",      value: formatRatio(ratio),                          unit: "" },
        ].map(({ label, value, unit }) => (
          <div key={label} className="card-ghost rounded-xl p-3">
            <p className="text-[10px] font-data text-dim tracking-wider uppercase mb-1.5">{label}</p>
            <p className="font-data text-sm font-semibold text-ink leading-tight">
              {value}
              {unit && <span className="text-muted text-[11px] ml-1">{unit}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Health bar */}
      <VaultHealthBar ratio={ratio} />

      {/* Actions */}
      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
        <Link href={`/vaults/${vaultId}`} className="btn btn-primary flex-1 text-sm">
          Manage
        </Link>
        <Link href="/vaults" className="btn btn-secondary text-sm sm:w-auto">
          New Vault
        </Link>
      </div>
    </div>
  );
}
