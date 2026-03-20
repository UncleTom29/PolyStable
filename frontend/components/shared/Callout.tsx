/* ─── Callout ─────────────────────────────────────────────────────────────
   components/shared/Callout.tsx
───────────────────────────────────────────────────────────────────────────── */
"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type CalloutTone = "success" | "error" | "info" | "warning";

interface CalloutProps {
  tone?: CalloutTone;
  children: ReactNode;
  className?: string;
  title?: string;
}

const STYLES: Record<CalloutTone, { wrap: string; icon: string; label: string }> = {
  success: {
    wrap:  "border-emerald/30 bg-emerald/[0.07] text-emerald",
    icon:  "✓",
    label: "Success",
  },
  error: {
    wrap:  "border-rose/30 bg-rose/[0.07] text-rose",
    icon:  "✕",
    label: "Error",
  },
  info: {
    wrap:  "border-teal/30 bg-teal/[0.07] text-teal",
    icon:  "i",
    label: "Info",
  },
  warning: {
    wrap:  "border-amber/30 bg-amber/[0.07] text-amber",
    icon:  "!",
    label: "Warning",
  },
};

export function Callout({ tone = "info", children, className, title }: CalloutProps) {
  const { wrap, icon, label } = STYLES[tone];

  return (
    <div className={cn("rounded-xl border p-4 flex gap-3", wrap, className)}>
      <span className="shrink-0 w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-bold mt-0.5">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        {title && (
          <p className="text-[12px] font-semibold tracking-wide uppercase mb-1 opacity-80">
            {label}
          </p>
        )}
        <div className="text-sm leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  );
}