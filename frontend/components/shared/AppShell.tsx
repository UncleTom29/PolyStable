"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { type ReactNode, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

/* ─── Icons ──────────────────────────────────────────────────────────────── */

function IconGrid({ className }: { className?: string }) {
  return (
    <svg className={cn("w-4 h-4", className)} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.2" />
      <rect x="9"   y="1.5" width="5.5" height="5.5" rx="1.2" />
      <rect x="1.5" y="9"   width="5.5" height="5.5" rx="1.2" />
      <rect x="9"   y="9"   width="5.5" height="5.5" rx="1.2" />
    </svg>
  );
}

function IconVault({ className }: { className?: string }) {
  return (
    <svg className={cn("w-4 h-4", className)} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="12" height="11" rx="1.5" />
      <circle cx="8" cy="8.5" r="2.2" />
      <path d="M8 6.3V3M2 6h12" />
      <path d="M4 11.5h.01M12 11.5h.01" strokeWidth="2" />
    </svg>
  );
}

function IconGov({ className }: { className?: string }) {
  return (
    <svg className={cn("w-4 h-4", className)} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.5L1.5 5.5v1h13v-1L8 1.5z" />
      <path d="M3 6.5v5M6.5 6.5v5M9.5 6.5v5M13 6.5v5" />
      <path d="M1.5 11.5h13M1.5 13.5h13" />
    </svg>
  );
}

function IconAlert({ className }: { className?: string }) {
  return (
    <svg className={cn("w-4 h-4", className)} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.5L1 14h14L8 1.5z" />
      <path d="M8 6v4" />
      <circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg className={cn("w-4 h-4", className)} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M3 3l10 10M13 3L3 13" />
    </svg>
  );
}

function IconMenu({ className }: { className?: string }) {
  return (
    <svg className={cn("w-5 h-5", className)} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M3 5h14M3 10h14M3 15h14" />
    </svg>
  );
}

function IconExternal({ className }: { className?: string }) {
  return (
    <svg className={cn("w-3 h-3", className)} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 1h4v4M11 1L5 7M2 4H1v7h7V9" />
    </svg>
  );
}

/* ─── Nav items ──────────────────────────────────────────────────────────── */

const NAV = [
  { href: "/dashboard",    label: "Dashboard",    mobileLabel: "Home",   Icon: IconGrid  },
  { href: "/vaults",       label: "Vaults",       mobileLabel: "Vaults", Icon: IconVault },
  { href: "/governance",   label: "Governance",   mobileLabel: "Vote",   Icon: IconGov   },
  { href: "/liquidations", label: "Liquidations", mobileLabel: "Risk",   Icon: IconAlert },
];

/* ─── Logo ───────────────────────────────────────────────────────────────── */

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shrink-0 shadow-glow transition-all group-hover:scale-105">
        <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="white">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2C8 2 4.5 4 2.5 7.2L4.8 8.6A8 8 0 0 1 12 4V2z" opacity=".5" />
          <path d="M22 12a10 10 0 0 1-4 8l-1.4-2.3A8 8 0 0 0 20 12h2z" opacity=".7" />
          <path d="M12 22a10 10 0 0 1-9.5-6.8L4.8 14A8 8 0 0 0 12 20v2z" opacity=".4" />
        </svg>
      </div>
      <div>
        <div className="font-display font-bold text-ink text-[15px] leading-none tracking-tight">
          PolyStable
        </div>
        <div className="text-[10px] font-data text-muted mt-0.5 leading-none tracking-widest uppercase">
          Polkadot
        </div>
      </div>
    </Link>
  );
}

/* ─── Network pill ───────────────────────────────────────────────────────── */

function NetworkBadge() {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal/10 border border-teal/20">
      <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse2 shrink-0" />
      <span className="text-[10px] font-data text-teal tracking-widest uppercase">
        Testnet
      </span>
    </div>
  );
}

/* ─── Sidebar (desktop) ──────────────────────────────────────────────────── */

function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar hidden lg:flex">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <Logo />
      </div>

      {/* Network */}
      <div className="px-5 py-3 border-b border-border">
        <NetworkBadge />
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5" aria-label="Main navigation">
        <p className="px-3 pt-2 pb-1.5 text-[10px] font-data text-dim tracking-[0.15em] uppercase">
          Navigate
        </p>
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn("nav-link", active && "active")}
            >
              <Icon className="shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Wallet at bottom */}
      <div className="p-4 border-t border-border space-y-3">
        <div className="flex justify-start [&>div]:!w-full [&_button]:!w-full [&_button]:!justify-center [&_button]:!rounded-pill [&_button]:!text-sm [&_button]:!font-semibold">
          <ConnectButton />
        </div>
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] text-dim font-data">
            v1.0 — Polkadot Hub
          </span>
          <a
            href="https://github.com/UncleTom29/PolyStable"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-dim hover:text-muted flex items-center gap-1 transition-colors"
          >
            GitHub <IconExternal />
          </a>
        </div>
      </div>
    </aside>
  );
}

/* ─── Mobile header ──────────────────────────────────────────────────────── */

function MobileHeader({ onOpen }: { onOpen: () => void }) {
  return (
    <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-4 bg-[#09111c]/90 backdrop-blur-xl border-b border-border">
      <Logo />
      <div className="flex items-center gap-2">
        <div className="scale-90 origin-right [&_button]:!rounded-full [&_button]:!text-xs [&_button]:!px-3 [&_button]:!py-1.5">
          <ConnectButton showBalance={false} accountStatus="avatar" />
        </div>
        <button
          onClick={onOpen}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface border border-border text-muted hover:text-ink transition-colors"
          aria-label="Open menu"
        >
          <IconMenu />
        </button>
      </div>
    </header>
  );
}

/* ─── Mobile drawer ──────────────────────────────────────────────────────── */

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={cn(
          "lg:hidden fixed right-0 top-0 bottom-0 z-50 w-[min(82vw,18rem)] bg-sidebar border-l border-border flex flex-col transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="font-display font-bold text-ink text-sm tracking-tight">Navigation</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface border border-border text-muted hover:text-ink transition-colors"
            aria-label="Close menu"
          >
            <IconClose />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn("nav-link", active && "active")}
              >
                <Icon />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <NetworkBadge />
        </div>
      </div>
    </>
  );
}

/* ─── Mobile bottom tab bar ──────────────────────────────────────────────── */

function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-[#09111c]/95 backdrop-blur-xl border-t border-border flex items-center">
      {NAV.map(({ href, label, mobileLabel, Icon }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 pt-2 pb-1 transition-colors",
              active ? "text-ink" : "text-dim"
            )}
          >
            <Icon className={cn("w-5 h-5", active && "text-brand")} />
            <span className="text-[10px] font-semibold tracking-wide">{mobileLabel ?? label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/* ─── AppShell (main export) ─────────────────────────────────────────────── */

interface AppShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
  showPageHeader?: boolean;
  noPad?: boolean;
}

export function AppShell({
  children,
  title,
  subtitle,
  eyebrow,
  actions,
  showPageHeader = true,
  noPad = false,
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-dvh flex">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile header & drawer */}
      <MobileHeader onOpen={() => setDrawerOpen(true)} />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Main content area */}
      <main
        id="main"
        className={cn(
          "flex-1 lg:ml-[240px]",
          "pt-14 lg:pt-0",
          "pb-20 lg:pb-12",
          !noPad && "px-4 sm:px-6 lg:px-8 py-8 lg:py-10"
        )}
      >
        {showPageHeader && (title || subtitle || eyebrow || actions) && (
          <PageHeader
            title={title}
            subtitle={subtitle}
            eyebrow={eyebrow}
            actions={actions}
          />
        )}
        {children}
      </main>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  );
}

/* ─── PageHeader ─────────────────────────────────────────────────────────── */

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
}: {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between animate-fade-up">
      <div className="space-y-2 max-w-2xl">
        {eyebrow && (
          <p className="text-[11px] font-data text-brand tracking-[0.2em] uppercase">
            {eyebrow}
          </p>
        )}
        {title && (
          <h1 className="font-display font-bold text-ink text-2xl sm:text-3xl lg:text-4xl tracking-tight leading-tight">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="text-muted text-sm sm:text-base leading-relaxed max-w-xl">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end shrink-0 [&>.btn]:w-full [&>.btn]:justify-center sm:[&>.btn]:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
}

/* ─── MetricCard ─────────────────────────────────────────────────────────── */

type Accent = "brand" | "teal" | "amber" | "green" | "rose";

const ACCENT_STRIP: Record<Accent, string> = {
  brand:  "accent-strip-brand",
  teal:   "accent-strip-teal",
  amber:  "accent-strip-amber",
  green:  "accent-strip-green",
  rose:   "accent-strip-rose",
};

const ACCENT_TEXT: Record<Accent, string> = {
  brand:  "text-[#f472b6]",
  teal:   "text-teal",
  amber:  "text-amber",
  green:  "text-emerald",
  rose:   "text-rose",
};

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  accent?: Accent;
  loading?: boolean;
}

export function MetricCard({ label, value, hint, accent = "brand", loading }: MetricCardProps) {
  return (
    <div className={cn("card rounded-card overflow-hidden", ACCENT_STRIP[accent])}>
      <div className="p-5">
        <p className="text-[11px] font-data text-muted tracking-[0.12em] uppercase mb-3">
          {label}
        </p>
        {loading ? (
          <div className="skeleton h-8 w-3/4 mb-2" />
        ) : (
          <p className={cn("font-display font-bold text-xl sm:text-3xl tracking-tight leading-tight break-words mb-2", ACCENT_TEXT[accent])}>
            {value}
          </p>
        )}
        {hint && (
          <p className="text-[12px] text-dim mt-1.5">{hint}</p>
        )}
      </div>
    </div>
  );
}

/* ─── SectionCard ────────────────────────────────────────────────────────── */

interface SectionCardProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  pad?: boolean;
}

export function SectionCard({ title, description, action, children, className, pad = true }: SectionCardProps) {
  return (
    <section className={cn("card rounded-card2 overflow-hidden", className)}>
      {(title || description || action) && (
        <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-border", pad ? "px-6 py-5" : "px-5 py-4")}>
          <div className="space-y-1 min-w-0">
            {title && (
              <h2 className="font-display font-bold text-ink text-xl tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-muted leading-relaxed max-w-lg">
                {description}
              </p>
            )}
          </div>
          {action && (
            <div className="flex w-full items-center gap-2 sm:w-auto shrink-0">{action}</div>
          )}
        </div>
      )}
      <div className={pad ? "p-6" : "p-5"}>{children}</div>
    </section>
  );
}

/* ─── DataRow ────────────────────────────────────────────────────────────── */

export function DataRow({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5 py-3 border-b border-border last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted">{label}</span>
      <span className={cn("text-sm font-semibold text-ink break-all sm:text-right", mono && "font-data text-[13px]")}>
        {value}
      </span>
    </div>
  );
}

/* ─── InlineCard ─────────────────────────────────────────────────────────── */

export function InlineCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("card-ghost p-4", className)}>
      {children}
    </div>
  );
}

/* ─── StatusPill ─────────────────────────────────────────────────────────── */

type PillTone = "success" | "warning" | "danger" | "neutral" | "info" | "brand";

const PILL_CLASS: Record<PillTone, string> = {
  success: "pill-success",
  warning: "pill-warning",
  danger:  "pill-danger",
  neutral: "pill-neutral",
  info:    "pill-info",
  brand:   "pill-brand",
};

export function StatusPill({
  children,
  tone = "neutral",
  dot = false,
}: {
  children: ReactNode;
  tone?: PillTone;
  dot?: boolean;
}) {
  const DOT_COLOR: Record<PillTone, string> = {
    success: "bg-emerald", warning: "bg-amber", danger: "bg-rose",
    neutral: "bg-muted", info: "bg-teal", brand: "bg-brand",
  };

  return (
    <span className={cn("pill", PILL_CLASS[tone])}>
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", DOT_COLOR[tone])} />}
      {children}
    </span>
  );
}

/* ─── EmptyState ─────────────────────────────────────────────────────────── */

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {icon ?? (
        <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mb-5">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-brand/70" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
          </svg>
        </div>
      )}
      <h3 className="font-display font-bold text-ink text-xl mb-2">{title}</h3>
      <p className="text-muted text-sm leading-relaxed max-w-sm mb-6">{description}</p>
      {action}
    </div>
  );
}

/* ─── WalletGate ─────────────────────────────────────────────────────────── */

export function WalletGate({
  title,
  description,
  note,
}: {
  title: string;
  description: string;
  note?: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-[50vh] sm:min-h-[60vh]">
      <div className="card-raised rounded-card2 p-6 sm:p-10 max-w-md w-full text-center">
        {/* Glow orb */}
        <div className="relative mx-auto w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-full bg-brand/20 blur-xl" />
          <div className="relative w-20 h-20 rounded-2xl bg-brand/10 border border-brand/25 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-brand" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a4 4 0 0 0-8 0v2" strokeLinecap="round" />
              <circle cx="12" cy="14" r="2" fill="currentColor" stroke="none" />
            </svg>
          </div>
        </div>

        <h2 className="font-display font-bold text-ink text-2xl tracking-tight mb-3">{title}</h2>
        <p className="text-muted text-sm leading-relaxed mb-8">{description}</p>

        <div className="flex justify-center [&>div]:!w-full [&_button]:!w-full [&_button]:!justify-center [&_button]:!min-h-[44px] [&_button]:!rounded-full [&_button]:!font-semibold">
          <ConnectButton />
        </div>

        {note && (
          <p className="mt-4 text-[11px] font-data text-dim tracking-widest uppercase">
            {note}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── LoadingRows ────────────────────────────────────────────────────────── */

export function LoadingRows({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-ghost rounded-card p-5 space-y-2.5">
          <div className="skeleton h-3.5 w-1/3 rounded" />
          <div className="skeleton h-6 w-1/2 rounded" />
          <div className="skeleton h-3 w-2/3 rounded" />
        </div>
      ))}
    </div>
  );
}
