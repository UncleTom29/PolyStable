"use client";

import Link from "next/link";
import { useProtocolStats } from "@/hooks/useProtocolStats";

function formatBigInt(val: bigint, decimals = 18, display = 2): string {
  const factor = 10n ** BigInt(decimals);
  const whole = val / factor;
  return whole.toLocaleString(undefined, { maximumFractionDigits: display });
}

export default function HomePage() {
  const stats = useProtocolStats();

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-pink-500">PolyStable</span>
        <div className="flex gap-6 text-sm text-gray-400">
          <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          <Link href="/vaults" className="hover:text-white transition-colors">Vaults</Link>
          <Link href="/governance" className="hover:text-white transition-colors">Governance</Link>
          <Link href="/liquidations" className="hover:text-white transition-colors">Liquidations</Link>
        </div>
        <Link
          href="/dashboard"
          className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Launch App
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-16 text-center">
        <h1 className="text-5xl font-bold mb-6 leading-tight">
          The first cross-chain CDP stablecoin
          <span className="text-pink-500"> on Polkadot</span>
        </h1>
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          Mint pUSD against DOT collateral with auto-staking rewards, governed
          by pGOV holders via XCM-powered on-chain governance.
        </p>
        <Link
          href="/dashboard"
          className="inline-block bg-pink-600 hover:bg-pink-500 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-colors"
        >
          Launch App →
        </Link>
      </section>

      {/* Feature cards */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-6">
        {[
          {
            title: "Cross-chain Collateral",
            icon: "🔗",
            desc: "Lock DOT and XCM parachain tokens as collateral. Earn yield while keeping pUSD exposure.",
          },
          {
            title: "Staking-Backed Stability",
            icon: "⛓️",
            desc: "Idle DOT is automatically bonded to Polkadot validators. Staking rewards flow to the Surplus Buffer.",
          },
          {
            title: "XCM-Powered Governance",
            icon: "🗳️",
            desc: "One Hub vote can update parameters across all registered parachains via XCM messages.",
          },
        ].map(({ title, icon, desc }) => (
          <div key={title} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="text-3xl mb-4">{icon}</div>
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-gray-400 text-sm">{desc}</p>
          </div>
        ))}
      </section>

      {/* Live stats bar */}
      <section className="border-y border-gray-800 py-6">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-gray-400 text-sm mb-1">Total pUSD</p>
            <p className="text-2xl font-bold">
              {stats.isLoading ? "…" : `${formatBigInt(stats.totalPUSDSupply)} pUSD`}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-1">Active Vaults</p>
            <p className="text-2xl font-bold">
              {stats.isLoading ? "…" : stats.totalVaults.toString()}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-1">Surplus Buffer</p>
            <p className="text-2xl font-bold">
              {stats.isLoading ? "…" : `${formatBigInt(stats.surplusBalance)} DOT`}
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { step: "1", title: "Deposit Collateral", desc: "Lock DOT or parachain tokens into a CDP vault." },
            { step: "2", title: "Mint pUSD", desc: "Borrow up to 66% of your collateral value as pUSD." },
            { step: "3", title: "Earn Staking Yield", desc: "Your DOT earns staking rewards that flow to the Surplus Buffer." },
            { step: "4", title: "Repay & Unlock", desc: "Repay pUSD plus accrued fees to unlock your collateral." },
          ].map(({ step, title, desc }) => (
            <div key={step} className="text-center">
              <div className="w-12 h-12 rounded-full bg-pink-600 flex items-center justify-center text-lg font-bold mx-auto mb-4">
                {step}
              </div>
              <h4 className="font-semibold mb-2">{title}</h4>
              <p className="text-gray-400 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 text-center text-gray-500 text-sm">
        <div className="flex justify-center gap-6 mb-4">
          <a href="https://github.com/UncleTom29/PolyStable" className="hover:text-white transition-colors">GitHub</a>
          <a href="https://discord.gg/WWgzkDfPQF" className="hover:text-white transition-colors">Discord</a>
          <a href="#" className="hover:text-white transition-colors">Docs</a>
          <a href="#" className="hover:text-white transition-colors">Twitter</a>
        </div>
        <p>© 2026 PolyStable · MIT License</p>
      </footer>
    </main>
  );
}
