"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { type AbiEvent, type Address } from "viem";
import {
  AppShell,
  EmptyState,
  LoadingRows,
  MetricCard,
  SectionCard,
  StatusPill,
  WalletGate,
} from "@/components/shared/AppShell";
import { LiquidationWatchlist, type LiquidatableVault, estimateProfit } from "@/components/liquidations/LiquidationWatchlist";
import {
  CONTRACT_ADDRESSES,
  VAULT_ENGINE_ABI,
  liquidationEngineConfig,
  vaultEngineConfig,
} from "@/lib/contracts";
import { usePrices } from "@/hooks/usePrices";
import { formatCurrencyAmount } from "@/lib/utils";
import { LIQUIDATION_REFRESH_MS } from "@/lib/constants";

export default function LiquidationsPage() {
  const { isConnected }         = useAccount();
  const publicClient            = usePublicClient();
  const { prices }              = usePrices(["DOT"]);
  const dotPriceUsd             = prices.DOT?.usd ?? 0;
  const [vaults, setVaults]     = useState<LiquidatableVault[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [lastRefresh, setLast]  = useState<Date | null>(null);

  const fetchVaults = useCallback(async () => {
    if (!publicClient) return;
    setLoading(true);
    try {
      const logs = await publicClient.getLogs({
        address: CONTRACT_ADDRESSES.VaultEngine,
        event: VAULT_ENGINE_ABI.find(
          (e) => e.type === "event" && e.name === "VaultOpened"
        ) as AbiEvent,
        fromBlock: 0n,
        toBlock: "latest",
      });

      const data: LiquidatableVault[] = [];

      for (const log of logs) {
        const args = (log as { args?: Record<string, unknown> }).args;
        if (!args) continue;
        const vaultId = args["vaultId"] as bigint;
        try {
          const [vault, ratio, liquidatable] = await Promise.all([
            publicClient.readContract({ ...vaultEngineConfig, functionName: "getVault", args: [vaultId] }),
            publicClient.readContract({ ...vaultEngineConfig, functionName: "getCollateralRatio", args: [vaultId] }),
            publicClient.readContract({ ...liquidationEngineConfig, functionName: "isLiquidatable", args: [vaultId] }),
          ]);
          if ((vault as { debt: bigint }).debt > 0n) {
            data.push({
              id: vaultId,
              owner: (vault as { owner: Address }).owner,
              lockedAmount: (vault as { lockedAmount: bigint }).lockedAmount,
              debt: (vault as { debt: bigint }).debt,
              ratio: ratio as bigint,
              isLiquidatable: liquidatable as boolean,
            });
          }
        } catch { /* skip */ }
      }

      data.sort((a, b) => {
        if (a.isLiquidatable && !b.isLiquidatable) return -1;
        if (!a.isLiquidatable && b.isLiquidatable) return 1;
        return Number(a.ratio) - Number(b.ratio);
      });

      setVaults(data);
      setLast(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    fetchVaults();
    const t = setInterval(fetchVaults, LIQUIDATION_REFRESH_MS);
    return () => clearInterval(t);
  }, [fetchVaults]);

  if (!isConnected) {
    return (
      <AppShell
        title="Liquidations"
        subtitle="Track vaults approaching the liquidation threshold and execute when profitable."
        eyebrow="Risk board"
      >
        <WalletGate
          title="Connect to access liquidations"
          description="Wallet connection is required to submit liquidation transactions. Browse the board freely once connected."
          note="Risk tooling"
        />
      </AppShell>
    );
  }

  const liquidatable = vaults.filter((v) => v.isLiquidatable);
  const bestProfit   = liquidatable.reduce(
    (max, v) => Math.max(max, estimateProfit(v, dotPriceUsd)), 0
  );

  return (
    <AppShell
      title="Liquidations"
      subtitle="Monitor at-risk vaults and act when collateral ratios breach the threshold."
      eyebrow="Risk board"
      actions={
        <button
          type="button"
          onClick={fetchVaults}
          disabled={isLoading}
          className="btn btn-primary text-sm"
        >
          {isLoading ? "Refreshing…" : "Refresh Now"}
        </button>
      }
    >
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Actionable"
          value={liquidatable.length.toLocaleString()}
          hint="Ready to liquidate"
          accent="rose"
        />
        <MetricCard
          label="Total tracked"
          value={vaults.length.toLocaleString()}
          hint="Debt positions observed"
          accent="teal"
        />
        <MetricCard
          label="Best profit"
          value={formatCurrencyAmount(bestProfit)}
          hint="Est. liquidation bonus"
          accent="green"
        />
        <MetricCard
          label="Auto-refresh"
          value={`${LIQUIDATION_REFRESH_MS / 1000}s`}
          hint={lastRefresh ? `Last: ${lastRefresh.toLocaleTimeString()}` : "Waiting…"}
          accent="amber"
        />
      </div>

      {/* Alert banner when there are liquidatable vaults */}
      {liquidatable.length > 0 && (
        <div className="mb-6 flex flex-col items-start gap-3 px-5 py-4 rounded-xl border border-rose/30 bg-rose/[0.06] sm:flex-row sm:items-center">
          <span className="w-2 h-2 rounded-full bg-rose animate-pulse2 shrink-0" />
          <p className="text-sm text-rose font-semibold">
            {liquidatable.length} vault{liquidatable.length !== 1 ? "s" : ""} currently liquidatable
          </p>
          <StatusPill tone="danger">{liquidatable.length} actionable</StatusPill>
        </div>
      )}

      {/* Watchlist */}
      <SectionCard
        title="Vault watchlist"
        description="Cards on mobile, sortable table on desktop. Sorted by collateral ratio ascending — most at-risk first."
        action={
          <StatusPill tone={isLoading ? "neutral" : "info"} dot>
            {isLoading ? "fetching…" : `${vaults.length} vaults`}
          </StatusPill>
        }
      >
        {isLoading && vaults.length === 0 ? (
          <LoadingRows count={3} />
        ) : vaults.length === 0 ? (
          <EmptyState
            title="No debt positions found"
            description="When vaults are opened on-chain, they'll appear here with ratio and liquidation status in real time."
          />
        ) : (
          <LiquidationWatchlist vaults={vaults} />
        )}
      </SectionCard>
    </AppShell>
  );
}
