"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useProtocolStats } from "@/hooks/useProtocolStats";
import { formatTokenAmount } from "@/lib/utils";

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center shadow-glow">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2C8 2 4.5 4 2.5 7.2L4.8 8.6A8 8 0 0 1 12 4V2z" opacity=".5" />
          <path d="M22 12a10 10 0 0 1-4 8l-1.4-2.3A8 8 0 0 0 20 12h2z" opacity=".7" />
          <path d="M12 22a10 10 0 0 1-9.5-6.8L4.8 14A8 8 0 0 0 12 20v2z" opacity=".4" />
        </svg>
      </div>
      <span className="font-display font-bold text-ink text-xl tracking-tight">PolyStable</span>
    </div>
  );
}

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a4 4 0 0 0-8 0v2" />
        <circle cx="12" cy="14" r="2" fill="currentColor" stroke="none" />
      </svg>
    ),
    accent: "brand",
    title: "Overcollateralised vaults",
    body:  "Lock native DOT and mint pUSD against your position. Borrow headroom and safety ratios are visible at every step.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3l7 7m0 0l7-7M10 10v12" />
        <path d="M21 21l-7-7m0 0l-7 7M14 14V2" />
      </svg>
    ),
    accent: "teal",
    title: "On-chain governance",
    body:  "pGOV holders vote on protocol parameters, debt ceilings, and collateral policy. Delegate or vote from the same interface.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L3 7v11h18V7L12 2z" />
        <path d="M9 22V12h6v10" />
      </svg>
    ),
    accent: "amber",
    title: "Liquidation visibility",
    body:  "Track at-risk positions in real time. Operators and liquidators get clear ratio signals and one-click execution.",
  },
];

const STEPS = [
  { n: "01", title: "Deposit DOT",       body: "Lock native DOT collateral in a vault and see your borrowing headroom instantly." },
  { n: "02", title: "Mint pUSD",          body: "Issue pUSD against your position while staying safely above the minimum ratio." },
  { n: "03", title: "Monitor health",     body: "Track your vault ratio, protocol surplus buffer, and system-wide debt from the dashboard." },
  { n: "04", title: "Repay & rebalance",  body: "Close risk by repaying pUSD or adding collateral before liquidation pressure builds." },
];

const ACCENT_BG: Record<string, string> = {
  brand: "bg-brand/10 border-brand/25 text-[#f472b6]",
  teal:  "bg-teal/10  border-teal/25  text-teal",
  amber: "bg-amber/10 border-amber/25 text-amber",
};

export default function HomePage() {
  const stats = useProtocolStats();

  const metricsData = [
    {
      label: "Total pUSD minted",
      value: stats.isLoading ? "—" : `${formatTokenAmount(stats.totalPUSDSupply)} pUSD`,
      accent: "brand",
    },
    {
      label: "Active vaults",
      value: stats.isLoading ? "—" : stats.totalVaults.toLocaleString(),
      accent: "teal",
    },
    {
      label: "Surplus buffer",
      value: stats.isLoading ? "—" : `${formatTokenAmount(stats.surplusBalance)} DOT`,
      accent: "amber",
    },
    {
      label: "System health",
      value:
        stats.isLoading || stats.systemDebt === 0n
          ? "∞"
          : `${formatTokenAmount(stats.systemHealth, 18, 2)}×`,
      accent: "green",
    },
  ];

  return (
    <div className="min-h-dvh flex flex-col bg-base">
      {/* ── Top nav ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[rgba(255,255,255,0.07)] bg-[#07090f]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Logo />
          <nav className="hidden sm:flex items-center gap-1">
            {[
              { href: "/dashboard",    label: "Dashboard" },
              { href: "/vaults",       label: "Vaults" },
              { href: "/governance",   label: "Governance" },
              { href: "/liquidations", label: "Liquidations" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-3 py-2 rounded-lg text-sm text-muted hover:text-ink hover:bg-surface2 transition-colors font-medium"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block [&_button]:!rounded-full [&_button]:!text-sm [&_button]:!font-semibold [&_button]:!min-h-[38px] [&_button]:!px-4">
              <ConnectButton />
            </div>
            <Link href="/dashboard" className="btn btn-primary text-sm px-5 h-10">
              Launch App
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Background decorations */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-brand/5 blur-[120px]" />
            <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-teal/5 blur-[100px]" />
            {/* Grid lines */}
            <div
              className="absolute inset-0 opacity-[0.025]"
              style={{
                backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                backgroundSize: "80px 80px",
              }}
            />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
            <div className="max-w-4xl">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-teal/25 bg-teal/8 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse2" />
                <span className="text-[11px] font-data text-teal tracking-[0.18em] uppercase">
                  Polkadot Hub Testnet — Live
                </span>
              </div>

              {/* Headline */}
              <h1 className="font-display font-bold text-ink leading-[1.04] tracking-tight mb-6"
                style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}>
                Mint <span className="text-brand">pUSD</span> against<br />
                your DOT collateral.
              </h1>

              <p className="text-lg text-muted leading-relaxed max-w-2xl mb-10">
                PolyStable is a Polkadot-native CDP protocol. Open vaults, borrow stablecoins,
                participate in governance, and monitor liquidation risk — all from one interface.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Link href="/vaults" className="btn btn-primary text-base px-7 h-12">
                  Open a Vault
                </Link>
                <Link href="/dashboard" className="btn btn-secondary text-base px-7 h-12">
                  View Dashboard
                </Link>
                <a
                  href="https://github.com/UncleTom29/PolyStable"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost text-sm text-muted"
                >
                  GitHub ↗
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── Live stats strip ──────────────────────────────────── */}
        <section className="border-y border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.018)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-[rgba(255,255,255,0.07)]">
              {metricsData.map(({ label, value, accent }) => (
                <div key={label} className="px-6 py-5 first:pl-0">
                  <p className="text-[10px] font-data text-dim tracking-[0.15em] uppercase mb-2">{label}</p>
                  <p className={`font-display font-bold text-xl tracking-tight ${
                    accent === "brand" ? "text-[#f472b6]" :
                    accent === "teal"  ? "text-teal" :
                    accent === "amber" ? "text-amber" :
                    "text-emerald"
                  }`}>
                    {stats.isLoading ? (
                      <span className="inline-block skeleton h-6 w-24 rounded" />
                    ) : value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="mb-14">
            <p className="text-[11px] font-data text-brand tracking-[0.2em] uppercase mb-3">Protocol design</p>
            <h2 className="font-display font-bold text-ink text-3xl sm:text-4xl tracking-tight max-w-xl">
              Built for productive capital.
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card rounded-card2 p-6 space-y-4 group hover:border-[rgba(255,255,255,0.12)] transition-all">
                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${ACCENT_BG[f.accent]}`}>
                  {f.icon}
                </div>
                <h3 className="font-display font-bold text-ink text-xl tracking-tight">{f.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────── */}
        <section className="border-t border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.015)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="mb-14">
              <p className="text-[11px] font-data text-teal tracking-[0.2em] uppercase mb-3">Getting started</p>
              <h2 className="font-display font-bold text-ink text-3xl sm:text-4xl tracking-tight">
                Four steps from DOT to pUSD.
              </h2>
            </div>

            <div className="grid gap-px bg-[rgba(255,255,255,0.07)] sm:grid-cols-2 lg:grid-cols-4 rounded-card2 overflow-hidden">
              {STEPS.map((s) => (
                <div key={s.n} className="bg-base p-6 sm:p-7 space-y-4">
                  <span className="font-data text-[11px] text-brand tracking-[0.2em]">{s.n}</span>
                  <h3 className="font-display font-bold text-ink text-xl tracking-tight">{s.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="relative rounded-card2 overflow-hidden border border-brand/20 bg-brand/[0.04] p-10 sm:p-14">
            <div className="pointer-events-none absolute top-0 right-0 w-64 h-64 bg-brand/10 blur-[80px] rounded-full" />
            <div className="relative max-w-2xl">
              <h2 className="font-display font-bold text-ink text-3xl sm:text-4xl tracking-tight mb-4">
                Ready to open your first vault?
              </h2>
              <p className="text-muted text-base leading-relaxed mb-8">
                Connect your wallet, deposit DOT as collateral, and mint pUSD in under two minutes.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/vaults" className="btn btn-primary text-base px-7 h-12">
                  Open a Vault
                </Link>
                <Link href="/dashboard" className="btn btn-secondary text-base px-7 h-12">
                  View Dashboard
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-[rgba(255,255,255,0.07)] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Logo />
          <p className="text-xs text-dim">
            Polkadot-native stablecoin — testnet preview
          </p>
          <div className="flex items-center gap-5 text-xs text-muted">
            <a href="https://github.com/UncleTom29/PolyStable" target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-colors">GitHub</a>
            <a href="https://discord.gg/WWgzkDfPQF" target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-colors">Discord</a>
            <Link href="/dashboard" className="hover:text-ink transition-colors">App</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}