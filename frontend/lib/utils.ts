import { type ClassValue, clsx } from "clsx";
import { MIN_COLLATERAL_RATIO, SAFE_COLLATERAL_RATIO } from "@/lib/constants";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

type MaxFractionDigits = 0|1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20;

export function formatTokenAmount(
  amount: bigint,
  decimals: number = 18,
  maximumFractionDigits: MaxFractionDigits = 2,
): string {
  return (Number(amount) / 10 ** decimals).toLocaleString(undefined, { maximumFractionDigits });
}

export function formatCurrencyAmount(
  amount: number,
  maximumFractionDigits: MaxFractionDigits = 2,
): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  }).format(amount);
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatAmount(amount: bigint, decimals = 18, displayDecimals = 2): string {
  const divisor = 10n ** BigInt(decimals);
  const whole   = amount / divisor;
  const frac    = amount % divisor;
  const fracStr = frac.toString().padStart(decimals, "0").slice(0, displayDecimals);
  return `${whole.toLocaleString()}.${fracStr}`;
}

export function formatRatio(ratio: bigint): string {
  return `${(Number(ratio) / 1e16).toFixed(1)}%`;
}

export function getRatioColor(ratio: bigint): string {
  const pct = Number(ratio) / 1e16;
  if (pct >= SAFE_COLLATERAL_RATIO)  return "text-emerald";
  if (pct >= MIN_COLLATERAL_RATIO)   return "text-amber";
  return "text-rose";
}

export function getRatioStatus(ratio: bigint): "safe" | "warning" | "danger" {
  const pct = Number(ratio) / 1e16;
  if (pct >= SAFE_COLLATERAL_RATIO)  return "safe";
  if (pct >= MIN_COLLATERAL_RATIO)   return "warning";
  return "danger";
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorField(error: unknown, key: "message" | "shortMessage" | "details"): string | null {
  if (!error || typeof error !== "object" || !(key in error)) return null;
  const value = (error as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function formatContractWriteError(
  error: unknown,
  options?: { fallbackMessage?: string; isNativeVaultAction?: boolean }
): string {
  const fallbackMessage = options?.fallbackMessage ?? "Transaction failed.";
  const shortMessage = getErrorField(error, "shortMessage");
  const message = getErrorField(error, "message");
  const details = getErrorField(error, "details");
  const combined = [shortMessage, message, details].filter(Boolean).join(" ");

  if (
    options?.isNativeVaultAction &&
    /invalid transaction|execution reverted/i.test(combined)
  ) {
    return "Native DOT vault transactions are reverting on the current deployment's native staking path. Recompile and redeploy with `viaIR` disabled and the updated native staking calldata path, then retry.";
  }

  return shortMessage ?? message ?? details ?? fallbackMessage;
}
