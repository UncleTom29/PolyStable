"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount } from "wagmi";
import { parseEther, type Address } from "viem";
import {
  AppShell,
  MetricCard,
  SectionCard,
  StatusPill,
  WalletGate,
  DataRow,
} from "@/components/shared/AppShell";
import { Callout } from "@/components/shared/Callout";
import { FormField } from "@/components/shared/FormField";
import { usePrices } from "@/hooks/usePrices";
import { useOpenVault } from "@/hooks/useVault";
import { MAX_RATIO_DISPLAY, MIN_COLLATERAL_RATIO, SAFE_COLLATERAL_RATIO } from "@/lib/constants";
import { formatCurrencyAmount } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function VaultsPage() {
  const { isConnected } = useAccount();
  const { openVault, isLoading, error } = useOpenVault();
  const { prices, isLoading: pricesLoading } = usePrices(["DOT"]);
  const [deposit, setDeposit] = useState("");
  const [mint, setMint]       = useState("");
  const [txHash, setTxHash]   = useState<string | null>(null);

  const dotPriceUsd = prices.DOT?.usd ?? 0;
  const depositNum  = parseFloat(deposit) || 0;
  const mintNum     = parseFloat(mint)    || 0;
  const collValue   = depositNum * dotPriceUsd;
  const ratio       = mintNum > 0 ? (collValue * 100) / mintNum : 0;
  const maxMint     = collValue > 0 ? collValue / 1.5 : 0;
  const safeMint    = maxMint * 0.66;

  const ratioStatus =
    mintNum === 0         ? "idle"
    : ratio >= SAFE_COLLATERAL_RATIO ? "safe"
    : ratio >= MIN_COLLATERAL_RATIO  ? "warning"
    : "danger";

  const RATIO_COLORS: Record<string, string> = {
    idle: "text-muted", safe: "text-emerald", warning: "text-amber", danger: "text-rose",
  };
  const RATIO_BAR: Record<string, string> = {
    idle: "bg-surface2", safe: "bg-emerald", warning: "bg-amber", danger: "bg-rose",
  };
  const RATIO_PILL: Record<string, "neutral" | "success" | "warning" | "danger"> = {
    idle: "neutral", safe: "success", warning: "warning", danger: "danger",
  };
  const RATIO_LABEL: Record<string, string> = {
    idle: "awaiting input", safe: "comfortable", warning: "watch closely", danger: "below minimum",
  };

  const handleAutoMint = () => {
    if (!depositNum) return;
    setMint(safeMint.toFixed(2));
  };

  const handleOpenVault = async () => {
    if (!deposit || !mint || ratio < MIN_COLLATERAL_RATIO) return;
    try {
      const hash = await openVault(
        "0x0000000000000000000000000000000000000000" as Address,
        parseEther(deposit),
        parseEther(mint),
        true
      );
      setTxHash(hash);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isConnected) {
    return (
      <AppShell title="Open a Vault" subtitle="Deposit DOT collateral and mint pUSD with clear risk guardrails." eyebrow="Vault creation">
        <WalletGate
          title="Connect to open a vault"
          description="Once connected, deposit DOT, preview your collateral ratio, and mint pUSD from this screen."
          note="Collateral flow"
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Open a Vault"
      subtitle="Configure your DOT deposit, review the ratio preview, and mint pUSD."
      eyebrow="Vault creation"
      actions={
        <>
          <Link href="/dashboard" className="btn btn-ghost text-sm">← Dashboard</Link>
          <button type="button" onClick={handleAutoMint} disabled={!depositNum} className="btn btn-secondary text-sm">
            Auto Safe Mint
          </button>
        </>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        {/* ── Left: Form ─────────────────────────────────────────── */}
        <div className="space-y-5">
          <SectionCard title="Collateral & borrow" description="DOT is locked as native collateral. Enter your deposit, then choose how much pUSD to mint.">
            {/* Collateral info strip */}
            <div className="flex flex-col items-start justify-between gap-3 p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] mb-6 sm:flex-row sm:items-center">
              <div>
                <p className="text-[11px] font-data text-dim tracking-wider uppercase mb-1">Collateral asset</p>
                <p className="font-display font-bold text-ink text-xl">DOT (native)</p>
              </div>
              <StatusPill tone={pricesLoading ? "neutral" : "info"} dot>
                {pricesLoading ? "Loading…" : `$${dotPriceUsd.toFixed(2)}`}
              </StatusPill>
            </div>

            {/* Inputs */}
            <div className="grid sm:grid-cols-2 gap-5 mb-6">
              <FormField label="Deposit amount" htmlFor="deposit" hint="Amount of DOT to lock as collateral">
                <div className="relative">
                  <input
                    id="deposit"
                    type="number"
                    min="0"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                    placeholder="0.00"
                    className="input pr-16"
                  />
                  <span className="absolute inset-y-0 right-4 flex items-center text-sm font-data font-semibold text-muted pointer-events-none">
                    DOT
                  </span>
                </div>
              </FormField>

              <FormField label="Mint amount" htmlFor="mint" hint="Amount of pUSD to borrow against collateral">
                <div className="relative">
                  <input
                    id="mint"
                    type="number"
                    min="0"
                    value={mint}
                    onChange={(e) => setMint(e.target.value)}
                    placeholder="0.00"
                    className="input pr-16"
                  />
                  <span className="absolute inset-y-0 right-4 flex items-center text-sm font-data font-semibold text-muted pointer-events-none">
                    pUSD
                  </span>
                </div>
              </FormField>
            </div>

            {/* Ratio display */}
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-5 mb-5">
              <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-data text-dim tracking-wider uppercase mb-2">Collateral ratio</p>
                  <p className={cn("font-display font-bold text-4xl tracking-tight", RATIO_COLORS[ratioStatus])}>
                    {mintNum > 0 ? `${ratio.toFixed(1)}%` : "—"}
                  </p>
                </div>
                <StatusPill tone={RATIO_PILL[ratioStatus]}>
                  {RATIO_LABEL[ratioStatus]}
                </StatusPill>
              </div>

              {/* Progress bar */}
              <div className="relative h-2.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden mb-3">
                {/* Markers */}
                <div className="absolute top-0 bottom-0 w-px bg-rose/50"    style={{ left: `${(MIN_COLLATERAL_RATIO / MAX_RATIO_DISPLAY) * 100}%` }} />
                <div className="absolute top-0 bottom-0 w-px bg-emerald/40" style={{ left: `${(SAFE_COLLATERAL_RATIO / MAX_RATIO_DISPLAY) * 100}%` }} />
                <div
                  className={cn("h-full rounded-full transition-all duration-500", RATIO_BAR[ratioStatus])}
                  style={{ width: `${mintNum === 0 ? 0 : Math.min(100, (ratio / MAX_RATIO_DISPLAY) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-data text-dim">
                <span>{MIN_COLLATERAL_RATIO}% min</span>
                <span>{SAFE_COLLATERAL_RATIO}% safe</span>
                <span>{MAX_RATIO_DISPLAY}%+</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={handleOpenVault}
                disabled={isLoading || !deposit || !mint || ratio < MIN_COLLATERAL_RATIO}
                className="btn btn-primary w-full sm:w-auto"
              >
                {isLoading ? "Opening vault…" : "Open Vault"}
              </button>
              <button type="button" onClick={handleAutoMint} className="btn btn-secondary w-full sm:w-auto">
                Auto-fill Safe Mint
              </button>
            </div>

            {txHash && (
              <Callout tone="success" className="mt-4">
                <p className="font-semibold mb-1.5">Vault transaction submitted!</p>
                <a
                  href={`https://blockscout-passet-hub.parity-testnet.parity.io/tx/${txHash}`}
                  target="_blank" rel="noopener noreferrer"
                  className="underline underline-offset-4 text-emerald hover:opacity-80"
                >
                  View on Blockscout →
                </a>
              </Callout>
            )}

            {error && <Callout tone="error" className="mt-4">{error.message}</Callout>}
          </SectionCard>

          {/* Live preview metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard label="Collateral value" value={formatCurrencyAmount(collValue)}        hint="At current DOT price" accent="teal"  />
            <MetricCard label="Max borrow"        value={formatCurrencyAmount(maxMint)}          hint="At 150% — hard floor" accent="amber" />
            <MetricCard label="Safe borrow"       value={formatCurrencyAmount(safeMint)}         hint="66% of max (recommended)" accent="green" />
          </div>
        </div>

        {/* ── Right: Guidance ───────────────────────────────────── */}
        <div className="space-y-5">
          <SectionCard title="Position preview" description="Updates live as you type.">
            <DataRow label="Deposit"         value={`${depositNum.toLocaleString(undefined, { maximumFractionDigits: 4 }) || "0"} DOT`} mono />
            <DataRow label="Mint"            value={`${mintNum.toLocaleString(undefined, { maximumFractionDigits: 2 }) || "0"} pUSD`} mono />
            <DataRow label="Collateral value" value={formatCurrencyAmount(collValue)} mono />
            <DataRow label="Ratio"           value={mintNum > 0 ? `${ratio.toFixed(1)}%` : "—"} mono />
            <DataRow label="Status"          value={
              <StatusPill tone={RATIO_PILL[ratioStatus]}>{RATIO_LABEL[ratioStatus]}</StatusPill>
            } />
          </SectionCard>

          <SectionCard title="Borrowing guidance">
            <div className="space-y-3">
              {[
                { title: "Start with safe mint",  body: "Targets 66% of the maximum borrow capacity — leaves buffer for market moves." },
                { title: "150% is the hard floor", body: "Positions right at the minimum have little tolerance for price swings or fee accrual." },
                { title: "You can rebalance later", body: "The vault detail view lets you add collateral, withdraw, or repay debt after opening." },
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
