"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useUserVaults } from "@/hooks/useVault";
import { useProtocolStats } from "@/hooks/useProtocolStats";
import { type Address } from "viem";

function formatBigInt(val: bigint, decimals = 18, display = 2): string {
  const factor = 10n ** BigInt(decimals);
  const whole = val / factor;
  return whole.toLocaleString(undefined, { maximumFractionDigits: display });
}

function getRatioBg(ratio: bigint): string {
  const pct = Number(ratio) / 1e16;
  if (pct >= 175) return "bg-green-500";
  if (pct >= 150) return "bg-yellow-500";
  return "bg-red-500";
}

function VaultSummaryCard({ vaultId }: { vaultId: bigint }) {
  const { vault, ratio, status } = { vault: null, ratio: 0n, status: "safe" as const };
  // In a real app we'd call useVault(vaultId) here
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex justify-between items-start mb-3">
        <span className="text-gray-400 text-sm">Vault #{vaultId.toString()}</span>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            status === "safe"
              ? "bg-green-900 text-green-400"
              : status === "warning"
              ? "bg-yellow-900 text-yellow-400"
              : "bg-red-900 text-red-400"
          }`}
        >
          {status.toUpperCase()}
        </span>
      </div>
      <div className="text-2xl font-bold mb-1">
        {formatBigInt(0n)} pUSD
      </div>
      <div className="text-sm text-gray-400 mb-3">Debt</div>
      <div className="w-full bg-gray-800 rounded-full h-2 mb-4">
        <div
          className={`h-2 rounded-full ${getRatioBg(ratio)}`}
          style={{ width: `${Math.min(100, Number(ratio) / 2e16)}%` }}
        />
      </div>
      <a
        href={`/vaults/${vaultId}`}
        className="text-pink-500 text-sm hover:text-pink-400 transition-colors"
      >
        Manage →
      </a>
    </div>
  );
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { vaultIds, isLoading: vaultsLoading } = useUserVaults(address as Address | undefined);
  const stats = useProtocolStats();

  if (!isConnected) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-bold">Connect your wallet</h1>
        <p className="text-gray-400">Connect to manage your PolyStable vaults</p>
        <ConnectButton />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <a href="/" className="text-xl font-bold text-pink-500">PolyStable</a>
        <ConnectButton />
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Total pUSD", value: stats.isLoading ? "…" : `${formatBigInt(stats.totalPUSDSupply)} pUSD` },
            { label: "Active Vaults", value: stats.isLoading ? "…" : stats.totalVaults.toString() },
            { label: "Surplus Buffer", value: stats.isLoading ? "…" : `${formatBigInt(stats.surplusBalance)} DOT` },
            { label: "System Health", value: stats.systemHealth > 0n ? `${formatBigInt(stats.systemHealth, 18, 2)}x` : "∞" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-gray-400 text-sm mb-1">{label}</p>
              <p className="text-xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        {/* Vaults section */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Your Vaults</h2>
          <a
            href="/vaults"
            className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Open New Vault
          </a>
        </div>

        {vaultsLoading ? (
          <div className="text-gray-400">Loading vaults…</div>
        ) : vaultIds.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
            <p className="text-gray-400 mb-4">No vaults yet</p>
            <a
              href="/vaults"
              className="bg-pink-600 hover:bg-pink-500 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors"
            >
              Open Your First Vault
            </a>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {vaultIds.map((id) => (
              <VaultSummaryCard key={id.toString()} vaultId={id} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
