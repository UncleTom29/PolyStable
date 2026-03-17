import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatAmount(
  amount: bigint,
  decimals = 18,
  displayDecimals = 2
): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  const fractionStr = fraction
    .toString()
    .padStart(decimals, "0")
    .slice(0, displayDecimals);
  return `${whole.toLocaleString()}.${fractionStr}`;
}

export function formatRatio(ratio: bigint): string {
  const pct = Number(ratio) / 1e16;
  return `${pct.toFixed(1)}%`;
}

export function getRatioColor(ratio: bigint): string {
  const pct = Number(ratio) / 1e16;
  if (pct >= 175) return "text-green-500";
  if (pct >= 150) return "text-yellow-500";
  return "text-red-500";
}

export function getRatioStatus(ratio: bigint): "safe" | "warning" | "danger" {
  const pct = Number(ratio) / 1e16;
  if (pct >= 175) return "safe";
  if (pct >= 150) return "warning";
  return "danger";
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
