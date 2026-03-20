"use client";

import { cn } from "@/lib/utils";
import { MIN_COLLATERAL_RATIO, SAFE_COLLATERAL_RATIO } from "@/lib/constants";

interface VaultHealthBarProps {
  ratio: bigint;
  showLabels?: boolean;
}

export function VaultHealthBar({ ratio, showLabels = true }: VaultHealthBarProps) {
  const ratioPct = Number(ratio) / 1e16;
  // Cap display at 300%
  const pct = Math.min(100, Math.max(0, (ratioPct / 300) * 100));

  const isSafe    = ratioPct >= SAFE_COLLATERAL_RATIO;
  const isWarning = ratioPct >= MIN_COLLATERAL_RATIO && ratioPct < SAFE_COLLATERAL_RATIO;
  const barColor = isSafe ? "bg-emerald" : isWarning ? "bg-amber" : "bg-rose";
  const textColor = isSafe ? "text-emerald" : isWarning ? "text-amber" : "text-rose";
  const glowColor = isSafe
    ? "shadow-[0_0_8px_rgba(34,196,126,0.5)]"
    : isWarning
    ? "shadow-[0_0_8px_rgba(240,180,41,0.5)]"
    : "shadow-[0_0_8px_rgba(247,75,90,0.5)]";

  return (
    <div className="space-y-2">
      {showLabels && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-data text-dim tracking-wide">
            {MIN_COLLATERAL_RATIO}% min
          </span>
          <span className={cn("text-[13px] font-data font-semibold tabular-nums", textColor)}>
            {ratioPct.toFixed(1)}%
          </span>
        </div>
      )}

      {/* Track */}
      <div className="relative h-2 w-full rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
        {/* Min ratio marker */}
        <div
          className="absolute top-0 bottom-0 w-px bg-rose/40"
          style={{ left: `${(MIN_COLLATERAL_RATIO / 300) * 100}%` }}
        />
        {/* Safe ratio marker */}
        <div
          className="absolute top-0 bottom-0 w-px bg-emerald/30"
          style={{ left: `${(SAFE_COLLATERAL_RATIO / 300) * 100}%` }}
        />
        {/* Fill */}
        <div
          className={cn("h-full rounded-full transition-all duration-700", barColor, glowColor)}
          style={{ width: `${pct}%` }}
        />
      </div>

      {showLabels && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-dim font-data">
            {SAFE_COLLATERAL_RATIO}% safe zone
          </span>
          <span className="text-[11px] text-dim font-data">300%+</span>
        </div>
      )}
    </div>
  );
}