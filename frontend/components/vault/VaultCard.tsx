"use client";

import Link from "next/link";
import { StatusPill } from "@/components/shared/AppShell";
import { VaultHealthBar } from "./VaultHealthBar";
import { formatTokenAmount, formatRatio } from "@/lib/utils";
import { MIN_COLLATERAL_RATIO, SAFE_COLLATERAL_RATIO } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface VaultCardProps {
  vaultId: bigint;
  lockedAmount: bigint;
  debt: bigint;
  ratio: bigint;
  collateral: string;
}

export function VaultCard({ vaultId, lockedAmount, debt, ratio, collateral }: VaultCardProps) {
  const ratioPct  = Number(ratio) / 1e16;
  const status    = ratioPct >= SAFE_COLLATERAL_RATIO ? "safe" : ratioPct >= MIN_COLLATERAL_RATIO ? "warning" : "danger";
  const tone      = status === "safe" ? "success" : status === "warning" ? "warning" : "danger";
  const collLabel = collateral === "0x0000000000000000000000000000000000000000" ? "DOT" : "ERC20";

  return (
    <div className={cn(
      "card rounded-card2 p-5 flex flex-col gap-5 transition-all hover:border-[rgba(255,255,255,0.12)]",
      status === "danger" && "border-rose/20"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-data text-dim tracking-widest uppercase mb-1">
            Vault #{vaultId.toString()}
          </p>
          <p className="font-display font-bold text-ink text-lg">
            {formatTokenAmount(lockedAmount)} {collLabel}
          </p>
        </div>
        <StatusPill tone={tone} dot>
          {status}
        </StatusPill>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-ghost rounded-xl p-3">
          <p className="text-[11px] font-data text-dim tracking-wider uppercase mb-1.5">Debt</p>
          <p className="font-data font-semibold text-ink text-sm">
            {formatTokenAmount(debt)} <span className="text-muted">pUSD</span>
          </p>
        </div>
        <div className="card-ghost rounded-xl p-3">
          <p className="text-[11px] font-data text-dim tracking-wider uppercase mb-1.5">Ratio</p>
          <p className={cn(
            "font-data font-semibold text-sm",
            status === "safe" ? "text-emerald" : status === "warning" ? "text-amber" : "text-rose"
          )}>
            {formatRatio(ratio)}
          </p>
        </div>
      </div>

      {/* Health bar */}
      <VaultHealthBar ratio={ratio} showLabels={false} />

      {/* Action */}
      <Link href={`/vaults/${vaultId}`} className="btn btn-secondary w-full">
        Manage Vault
      </Link>
    </div>
  );
}