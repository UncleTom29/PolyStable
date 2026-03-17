"use client";

import Link from "next/link";
import { VaultHealthBar } from "./VaultHealthBar";

interface VaultCardProps {
  vaultId: bigint;
  lockedAmount: bigint;
  debt: bigint;
  ratio: bigint;
  collateral: string;
}

export function VaultCard({ vaultId, lockedAmount, debt, ratio, collateral }: VaultCardProps) {
  const ratioPct = Number(ratio) / 1e16;
  const status =
    ratioPct >= 175 ? "safe" : ratioPct >= 150 ? "warning" : "danger";

  const statusColors = {
    safe: "bg-green-900 text-green-400",
    warning: "bg-yellow-900 text-yellow-400",
    danger: "bg-red-900 text-red-400",
  };

  function fmt(val: bigint): string {
    return (Number(val) / 1e18).toFixed(4);
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <span className="text-gray-400 text-sm">Vault #{vaultId.toString()}</span>
        <span className={`text-xs px-2 py-1 rounded-full ${statusColors[status]}`}>
          {status.toUpperCase()}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-500">Collateral</span>
          <span>{fmt(lockedAmount)} {collateral === "0x0000000000000000000000000000000000000000" ? "DOT" : "ERC20"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Debt</span>
          <span>{fmt(debt)} pUSD</span>
        </div>
      </div>

      <VaultHealthBar ratio={ratio} />

      <Link
        href={`/vaults/${vaultId}`}
        className="mt-4 block text-center text-sm text-pink-500 hover:text-pink-400 transition-colors"
      >
        Manage →
      </Link>
    </div>
  );
}
