"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseEther, type Address } from "viem";
import { useOpenVault } from "@/hooks/useVault";

function CollateralRatioPreview({ deposit, mint, price }: { deposit: number; mint: number; price: number }) {
  if (mint === 0) return null;
  const ratio = (deposit * price * 100) / mint;
  const color = ratio >= 175 ? "text-green-500" : ratio >= 150 ? "text-yellow-500" : "text-red-500";
  return (
    <div className="mt-2 text-sm">
      Ratio: <span className={`font-bold ${color}`}>{ratio.toFixed(1)}%</span>
      {ratio < 150 && <span className="text-red-400 ml-2">⚠ Below minimum</span>}
    </div>
  );
}

export default function VaultsPage() {
  const { isConnected } = useAccount();
  const { openVault, isLoading, error } = useOpenVault();
  const [deposit, setDeposit] = useState("");
  const [mint, setMint] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);

  // DOT price (in a real app, use usePrices())
  const DOT_PRICE = 10;

  const handleAutoMint = () => {
    if (!deposit) return;
    // Safe mint: 66% of max at 150% ratio
    const maxMint = (parseFloat(deposit) * DOT_PRICE) / 1.5;
    setMint((maxMint * 0.66).toFixed(2));
  };

  const handleOpenVault = async () => {
    if (!deposit || !mint) return;
    try {
      const depositWei = parseEther(deposit);
      const mintWei = parseEther(mint);
      const hash = await openVault(
        "0x0000000000000000000000000000000000000000" as Address,
        depositWei,
        mintWei,
        true
      );
      setTxHash(hash);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isConnected) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-bold">Connect your wallet</h1>
        <ConnectButton />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <a href="/" className="text-xl font-bold text-pink-500">PolyStable</a>
        <ConnectButton />
      </nav>

      <div className="max-w-xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-8">Open New Vault</h1>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6">
          {/* Collateral selector */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Collateral Type</label>
            <div className="bg-gray-800 rounded-lg px-4 py-3 flex items-center gap-2">
              <span className="text-lg">⚪</span>
              <span className="font-medium">DOT (Native)</span>
              <span className="ml-auto text-gray-400 text-sm">@ ${DOT_PRICE}</span>
            </div>
          </div>

          {/* Deposit */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Deposit Amount (DOT)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          {/* Mint */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Mint Amount (pUSD)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={mint}
                onChange={(e) => setMint(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500"
              />
              <button
                onClick={handleAutoMint}
                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 transition-colors"
              >
                Safe Max
              </button>
            </div>
            <CollateralRatioPreview
              deposit={parseFloat(deposit) || 0}
              mint={parseFloat(mint) || 0}
              price={DOT_PRICE}
            />
          </div>

          {/* Open Vault button */}
          <button
            onClick={handleOpenVault}
            disabled={isLoading || !deposit || !mint}
            className="w-full bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-semibold transition-colors"
          >
            {isLoading ? "Opening Vault…" : "Open Vault"}
          </button>

          {txHash && (
            <div className="text-green-400 text-sm text-center">
              ✅ Vault opened!{" "}
              <a
                href={`https://blockscout-passet-hub.parity-testnet.parity.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                View tx
              </a>
            </div>
          )}

          {error && (
            <div className="text-red-400 text-sm text-center">
              ❌ {error.message}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
