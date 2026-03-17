"use client";

import { useProtocolStats } from "@/hooks/useProtocolStats";

function fmt(val: bigint, d = 18): string {
  return (Number(val) / 10 ** d).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function ProtocolStats() {
  const stats = useProtocolStats();

  const items = [
    { label: "Total pUSD Supply", value: stats.isLoading ? "…" : `${fmt(stats.totalPUSDSupply)} pUSD` },
    { label: "Active Vaults", value: stats.isLoading ? "…" : stats.totalVaults.toString() },
    { label: "Surplus Buffer", value: stats.isLoading ? "…" : `${fmt(stats.surplusBalance)} DOT` },
    { label: "System Debt", value: stats.isLoading ? "…" : `${fmt(stats.systemDebt)} pUSD` },
    {
      label: "Buffer Health",
      value: stats.isLoading
        ? "…"
        : stats.totalSystemDebt === 0n
        ? "∞"
        : `${fmt(stats.systemHealth)}x`,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {items.map(({ label, value }) => (
        <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className="font-bold text-sm">{value}</p>
        </div>
      ))}
    </div>
  );
}
