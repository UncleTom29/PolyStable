"use client";

import { usePrices } from "@/hooks/usePrices";
import { useLiquidate } from "@/hooks/useVault";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import { LIQUIDATION_WARNING_RATIO } from "@/lib/constants";
import { formatAddress, formatCurrencyAmount, formatRatio, formatTokenAmount } from "@/lib/utils";
import { StatusPill } from "@/components/shared/AppShell";
import { type Address } from "viem";
import { cn } from "@/lib/utils";

export interface LiquidatableVault {
  id: bigint;
  owner: Address;
  lockedAmount: bigint;
  debt: bigint;
  ratio: bigint;
  isLiquidatable: boolean;
}

export function estimateProfit(vault: LiquidatableVault, dotPriceUsd: number): number {
  if (!vault.isLiquidatable) return 0;
  return (Number(vault.lockedAmount) / 1e18) * dotPriceUsd * 0.05;
}

function LiquidationAction({ vault }: { vault: LiquidatableVault }) {
  const { liquidate, isLoading } = useLiquidate(vault.id);

  if (!vault.isLiquidatable) {
    return <span className="text-xs text-dim font-data">Monitoring</span>;
  }

  return (
    <button
      type="button"
      onClick={() => liquidate(CONTRACT_ADDRESSES.LiquidationEngine)}
      disabled={isLoading}
      className="btn btn-danger text-sm"
    >
      {isLoading ? "Submitting…" : "Liquidate"}
    </button>
  );
}

function vaultTone(vault: LiquidatableVault): "danger" | "warning" | "neutral" {
  if (vault.isLiquidatable) return "danger";
  return Number(vault.ratio) / 1e16 < LIQUIDATION_WARNING_RATIO ? "warning" : "neutral";
}

/* ── Mobile card view ────────────────────────────────────────────────────── */

function VaultCard({ vault, dotPriceUsd }: { vault: LiquidatableVault; dotPriceUsd: number }) {
  const tone = vaultTone(vault);

  return (
    <div className={cn(
      "card rounded-card2 p-5 space-y-4",
      tone === "danger" && "border-rose/25"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-data text-dim tracking-widest uppercase mb-1">
            Vault #{vault.id.toString()}
          </p>
          <p className="font-data text-sm text-ink font-semibold">{formatAddress(vault.owner)}</p>
        </div>
        <StatusPill tone={tone} dot>
          {vault.isLiquidatable ? "Liquidatable" : "Watch"}
        </StatusPill>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {[
          { label: "C-Ratio",          value: formatRatio(vault.ratio), highlight: tone },
          { label: "Est. Profit",      value: formatCurrencyAmount(estimateProfit(vault, dotPriceUsd)) },
          { label: "Debt",             value: `${formatTokenAmount(vault.debt)} pUSD` },
          { label: "Collateral Value", value: formatCurrencyAmount((Number(vault.lockedAmount) / 1e18) * dotPriceUsd) },
        ].map(({ label, value, highlight }) => (
          <div key={label} className="card-ghost rounded-xl p-3">
            <p className="text-[10px] font-data text-dim tracking-wider uppercase mb-1">{label}</p>
            <p className={cn(
              "font-data text-sm font-semibold",
              highlight === "danger" ? "text-rose" : highlight === "warning" ? "text-amber" : "text-ink"
            )}>{value}</p>
          </div>
        ))}
      </div>

      <LiquidationAction vault={vault} />
    </div>
  );
}

/* ── Desktop table row ───────────────────────────────────────────────────── */

function TableRow({ vault, dotPriceUsd }: { vault: LiquidatableVault; dotPriceUsd: number }) {
  const tone = vaultTone(vault);

  return (
    <tr className="border-t border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.02)] transition-colors group">
      <td className="px-5 py-4 font-data text-sm font-semibold text-ink">
        #{vault.id.toString()}
      </td>
      <td className="px-5 py-4 font-data text-xs text-muted">{formatAddress(vault.owner)}</td>
      <td className={cn("px-5 py-4 font-data text-sm font-semibold",
        tone === "danger" ? "text-rose" : tone === "warning" ? "text-amber" : "text-ink"
      )}>
        {formatRatio(vault.ratio)}
      </td>
      <td className="px-5 py-4 font-data text-sm text-muted">
        {formatTokenAmount(vault.debt)} <span className="text-dim">pUSD</span>
      </td>
      <td className="px-5 py-4 font-data text-sm text-muted">
        {formatCurrencyAmount((Number(vault.lockedAmount) / 1e18) * dotPriceUsd)}
      </td>
      <td className="px-5 py-4 font-data text-sm font-semibold text-emerald">
        {formatCurrencyAmount(estimateProfit(vault, dotPriceUsd))}
      </td>
      <td className="px-5 py-4">
        <StatusPill tone={tone} dot>
          {vault.isLiquidatable ? "Actionable" : "Watch"}
        </StatusPill>
      </td>
      <td className="px-5 py-4">
        <LiquidationAction vault={vault} />
      </td>
    </tr>
  );
}

/* ── Main watchlist ──────────────────────────────────────────────────────── */

interface LiquidationWatchlistProps {
  vaults: LiquidatableVault[];
}

export function LiquidationWatchlist({ vaults }: LiquidationWatchlistProps) {
  const { prices } = usePrices(["DOT"]);
  const dotPriceUsd = prices.DOT?.usd ?? 0;

  return (
    <>
      {/* Mobile cards */}
      <div className="grid gap-4 lg:hidden">
        {vaults.map((vault) => (
          <VaultCard key={vault.id.toString()} vault={vault} dotPriceUsd={dotPriceUsd} />
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block overflow-hidden rounded-card border border-[rgba(255,255,255,0.07)]">
        <table className="min-w-full">
          <thead className="bg-[rgba(255,255,255,0.03)]">
            <tr>
              {["Vault", "Owner", "C-Ratio", "Debt", "Collateral Value", "Est. Profit", "Status", "Action"].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-[10px] font-data text-dim tracking-[0.15em] uppercase font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vaults.map((vault) => (
              <TableRow key={vault.id.toString()} vault={vault} dotPriceUsd={dotPriceUsd} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}