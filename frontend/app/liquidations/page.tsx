"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { type Address } from "viem";
import {
  vaultEngineConfig,
  liquidationEngineConfig,
  VAULT_ENGINE_ABI,
  CONTRACT_ADDRESSES,
} from "@/lib/contracts";
import { useLiquidate } from "@/hooks/useVault";

interface LiquidatableVault {
  id: bigint;
  owner: Address;
  lockedAmount: bigint;
  debt: bigint;
  ratio: bigint;
  isLiquidatable: boolean;
}

const DOT_PRICE = 10; // USD

function getRatioColor(ratio: bigint): string {
  const pct = Number(ratio) / 1e16;
  if (pct < 110) return "text-orange-400 bg-orange-950";
  if (pct < 125) return "text-yellow-400 bg-yellow-950";
  if (pct < 150) return "text-red-400 bg-red-950";
  return "text-gray-300";
}

function formatEther(val: bigint): string {
  return (Number(val) / 1e18).toFixed(4);
}

function LiquidationRow({ vault }: { vault: LiquidatableVault }) {
  const { liquidate, isLoading } = useLiquidate(vault.id);
  const ratioPct = Number(vault.ratio) / 1e16;
  const debtUSD = (Number(vault.debt) / 1e18).toFixed(2);
  const collateralUSD = ((Number(vault.lockedAmount) / 1e18) * DOT_PRICE).toFixed(2);
  const profitUSD = vault.isLiquidatable
    ? ((Number(vault.lockedAmount) / 1e18) * DOT_PRICE * 0.05).toFixed(2)
    : "0.00";

  return (
    <tr className={vault.isLiquidatable ? "bg-red-950/20" : ratioPct < 125 ? "bg-yellow-950/20" : ""}>
      <td className="px-4 py-3 text-sm">{vault.id.toString()}</td>
      <td className="px-4 py-3 text-sm font-mono text-gray-400">
        {vault.owner.slice(0, 6)}…{vault.owner.slice(-4)}
      </td>
      <td className={`px-4 py-3 text-sm font-bold ${getRatioColor(vault.ratio)}`}>
        {ratioPct.toFixed(1)}%
      </td>
      <td className="px-4 py-3 text-sm">{debtUSD} pUSD</td>
      <td className="px-4 py-3 text-sm">${collateralUSD}</td>
      <td className="px-4 py-3 text-sm text-green-400">${profitUSD}</td>
      <td className="px-4 py-3">
        {vault.isLiquidatable ? (
          <button
            onClick={() => liquidate(CONTRACT_ADDRESSES.LiquidationEngine)}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
          >
            {isLoading ? "…" : "Liquidate"}
          </button>
        ) : (
          <span className="text-gray-600 text-xs">Healthy</span>
        )}
      </td>
    </tr>
  );
}

export default function LiquidationsPage() {
  const { isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [vaults, setVaults] = useState<LiquidatableVault[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchVaults = useCallback(async () => {
    if (!publicClient) return;
    setIsLoading(true);
    try {
      // Get all vault IDs from VaultOpened events
      const logs = await publicClient.getLogs({
        address: CONTRACT_ADDRESSES.VaultEngine,
        event: VAULT_ENGINE_ABI.find(
          (x) => x.type === "event" && x.name === "VaultOpened"
        ) as Parameters<typeof publicClient.getLogs>[0]["event"],
        fromBlock: 0n,
        toBlock: "latest",
      });

      const vaultData: LiquidatableVault[] = [];

      for (const log of logs) {
        const args = (log as { args?: Record<string, unknown> }).args;
        if (!args) continue;
        const vaultId = args["vaultId"] as bigint;

        try {
          const [vault, ratio, liquidatable] = await Promise.all([
            publicClient.readContract({
              ...vaultEngineConfig,
              functionName: "getVault",
              args: [vaultId],
            }),
            publicClient.readContract({
              ...vaultEngineConfig,
              functionName: "getCollateralRatio",
              args: [vaultId],
            }),
            publicClient.readContract({
              ...liquidationEngineConfig,
              functionName: "isLiquidatable",
              args: [vaultId],
            }),
          ]);

          if ((vault as { debt: bigint }).debt > 0n) {
            vaultData.push({
              id: vaultId,
              owner: (vault as { owner: Address }).owner,
              lockedAmount: (vault as { lockedAmount: bigint }).lockedAmount,
              debt: (vault as { debt: bigint }).debt,
              ratio: ratio as bigint,
              isLiquidatable: liquidatable as boolean,
            });
          }
        } catch {
          // Skip unavailable vaults
        }
      }

      // Sort: liquidatable first, then by ratio ascending
      vaultData.sort((a, b) => {
        if (a.isLiquidatable && !b.isLiquidatable) return -1;
        if (!a.isLiquidatable && b.isLiquidatable) return 1;
        return Number(a.ratio) - Number(b.ratio);
      });

      setVaults(vaultData);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Failed to fetch vaults:", err);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    fetchVaults();
    const interval = setInterval(fetchVaults, 15_000);
    return () => clearInterval(interval);
  }, [fetchVaults]);

  if (!isConnected) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-bold">Connect your wallet</h1>
        <ConnectButton />
      </main>
    );
  }

  const liquidatableCount = vaults.filter((v) => v.isLiquidatable).length;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <a href="/" className="text-xl font-bold text-pink-500">PolyStable</a>
        <ConnectButton />
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Liquidations</h1>
            {liquidatableCount > 0 && (
              <p className="text-red-400 text-sm mt-1">
                ⚠ {liquidatableCount} vault{liquidatableCount > 1 ? "s" : ""} ready for liquidation
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            {lastRefresh && (
              <span className="text-gray-500 text-xs">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchVaults}
              disabled={isLoading}
              className="bg-gray-800 hover:bg-gray-700 text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {isLoading && vaults.length === 0 ? (
          <div className="text-gray-400">Loading vaults…</div>
        ) : vaults.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center text-gray-400">
            No active vaults found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-4 py-3 text-sm text-gray-400 font-medium">Vault ID</th>
                  <th className="px-4 py-3 text-sm text-gray-400 font-medium">Owner</th>
                  <th className="px-4 py-3 text-sm text-gray-400 font-medium">Ratio</th>
                  <th className="px-4 py-3 text-sm text-gray-400 font-medium">Debt</th>
                  <th className="px-4 py-3 text-sm text-gray-400 font-medium">Collateral (USD)</th>
                  <th className="px-4 py-3 text-sm text-gray-400 font-medium">Est. Profit</th>
                  <th className="px-4 py-3 text-sm text-gray-400 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {vaults.map((vault) => (
                  <LiquidationRow key={vault.id.toString()} vault={vault} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
