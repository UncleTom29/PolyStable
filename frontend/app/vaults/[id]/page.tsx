"use client";

import { useParams } from "next/navigation";
import { useVault } from "@/hooks/useVault";

function formatEther(val: bigint): string {
  return (Number(val) / 1e18).toFixed(4);
}

export default function VaultDetailPage() {
  const params = useParams<{ id: string }>();
  const vaultId = BigInt(params.id ?? "0");
  const { vault, ratio, status, isLoading } = useVault(vaultId);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-gray-400">Loading vault…</div>
      </main>
    );
  }

  if (!vault || vault.owner === "0x0000000000000000000000000000000000000000") {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-gray-400">Vault not found</div>
      </main>
    );
  }

  const ratioPct = Number(ratio) / 1e16;
  const statusColor =
    status === "safe"
      ? "text-green-400"
      : status === "warning"
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <a href="/" className="text-xl font-bold text-pink-500">PolyStable</a>
        <a href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</a>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold">Vault #{vaultId.toString()}</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor} bg-gray-800`}>
            {status.toUpperCase()}
          </span>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4 mb-6">
          <div className="flex justify-between">
            <span className="text-gray-400">Owner</span>
            <span className="font-mono text-sm">{vault.owner.slice(0, 8)}…{vault.owner.slice(-6)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Locked Collateral</span>
            <span>{formatEther(vault.lockedAmount)} DOT</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Debt</span>
            <span>{formatEther(vault.debt)} pUSD</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Collateral Ratio</span>
            <span className={statusColor}>{ratioPct.toFixed(1)}%</span>
          </div>

          {/* Health bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>150% min</span>
              <span>175% safe</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${
                  status === "safe" ? "bg-green-500" : status === "warning" ? "bg-yellow-500" : "bg-red-500"
                }`}
                style={{ width: `${Math.min(100, (ratioPct / 300) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4">
          <a href="#" className="bg-gray-800 hover:bg-gray-700 text-center py-3 rounded-xl text-sm font-medium transition-colors">
            Deposit More
          </a>
          <a href="#" className="bg-gray-800 hover:bg-gray-700 text-center py-3 rounded-xl text-sm font-medium transition-colors">
            Withdraw
          </a>
          <a href="#" className="bg-gray-800 hover:bg-gray-700 text-center py-3 rounded-xl text-sm font-medium transition-colors">
            Mint pUSD
          </a>
          <a href="#" className="bg-pink-600 hover:bg-pink-500 text-center py-3 rounded-xl text-sm font-medium transition-colors">
            Repay Debt
          </a>
        </div>
      </div>
    </main>
  );
}
