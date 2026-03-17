"use client";

interface VaultHealthBarProps {
  ratio: bigint;
  minRatio?: bigint;
}

export function VaultHealthBar({ ratio, minRatio = 15n * 10n ** 17n }: VaultHealthBarProps) {
  const ratioPct = Number(ratio) / 1e16;
  const minPct = Number(minRatio) / 1e16;

  const pct = Math.min(100, (ratioPct / 300) * 100);

  const color =
    ratioPct >= 175
      ? "bg-green-500"
      : ratioPct >= minPct
      ? "bg-yellow-500"
      : "bg-red-500";

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{minPct.toFixed(0)}% min</span>
        <span>{ratioPct.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2">
        <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
