"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type: ToastType;
  txHash?: string;
  onDismiss: () => void;
}

const CONFIG: Record<ToastType, { bar: string; icon: string; iconBg: string }> = {
  success: { bar: "bg-emerald", icon: "✓", iconBg: "bg-emerald/15 text-emerald border-emerald/30" },
  error:   { bar: "bg-rose",    icon: "✕", iconBg: "bg-rose/15 text-rose border-rose/30" },
  info:    { bar: "bg-teal",    icon: "i", iconBg: "bg-teal/15 text-teal border-teal/30" },
};

export function TransactionToast({ message, type, txHash, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const { bar, icon, iconBg } = CONFIG[type];

  return (
    <div
      className="relative card-raised rounded-xl flex items-start gap-3.5 p-4 shadow-lg overflow-hidden min-w-[300px] max-w-[360px] animate-fade-up"
      role="status"
      aria-live="polite"
    >
      {/* Left accent bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl", bar)} />

      {/* Icon */}
      <span className={cn("shrink-0 mt-0.5 w-7 h-7 rounded-lg border flex items-center justify-center text-[11px] font-bold", iconBg)}>
        {icon}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink">{message}</p>
        {txHash && (
          <a
            href={`https://blockscout-passet-hub.parity-testnet.parity.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 text-xs text-teal hover:text-teal/80 underline decoration-teal/40 underline-offset-2 inline-flex items-center gap-1 transition-colors"
          >
            View on explorer →
          </a>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-dim hover:text-muted hover:bg-surface2 transition-colors"
      >
        <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M2 2l8 8M10 2L2 10" />
        </svg>
      </button>
    </div>
  );
}

/* ─── useToast hook ─────────────────────────────────────────────────────── */

export function useToast() {
  const [toasts, setToasts] = useState<
    Array<{ id: number; message: string; type: ToastType; txHash?: string }>
  >([]);

  const addToast = (message: string, type: ToastType, txHash?: string) => {
    setToasts((prev) => [...prev, { id: Date.now(), message, type, txHash }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const ToastContainer = () => (
    <div className="fixed bottom-20 lg:bottom-6 right-4 z-[60] flex flex-col gap-2.5">
      {toasts.map((toast) => (
        <TransactionToast
          key={toast.id}
          {...toast}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );

  return { addToast, ToastContainer };
}