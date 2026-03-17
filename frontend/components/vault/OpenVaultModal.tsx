"use client";

import { useState } from "react";
import { parseEther, type Address } from "viem";
import { useOpenVault } from "@/hooks/useVault";

const MIN_COLLATERAL_RATIO = 1.5;
const SAFE_MINT_FACTOR = 0.66;

interface OpenVaultModalProps {
  onClose: () => void;
  onSuccess?: (txHash: string) => void;
}

export function OpenVaultModal({ onClose, onSuccess }: OpenVaultModalProps) {
  const [deposit, setDeposit] = useState("");
  const [mint, setMint] = useState("");
  const { openVault, isLoading, error } = useOpenVault();

  const DOT_PRICE = 10;
  const depositNum = parseFloat(deposit) || 0;
  const mintNum = parseFloat(mint) || 0;
  const ratio = mintNum > 0 ? (depositNum * DOT_PRICE * 100) / mintNum : 0;

  const ratioColor =
    ratio >= 175 ? "text-green-500" : ratio >= 150 ? "text-yellow-500" : "text-red-500";

  const handleSafeMax = () => {
    if (!deposit) return;
    setMint(((depositNum * DOT_PRICE) / MIN_COLLATERAL_RATIO * SAFE_MINT_FACTOR).toFixed(2));
  };

  const handleSubmit = async () => {
    if (!deposit || !mint) return;
    try {
      const hash = await openVault(
        "0x0000000000000000000000000000000000000000" as Address,
        parseEther(deposit),
        parseEther(mint),
        true
      );
      onSuccess?.(hash);
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Open New Vault</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <div className="space-y-4">
          {/* Collateral selector */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Collateral</label>
            <div className="bg-gray-800 rounded-lg px-4 py-3 flex items-center justify-between">
              <span>DOT (Native)</span>
              <span className="text-gray-400 text-sm">${DOT_PRICE}</span>
            </div>
          </div>

          {/* Deposit amount */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Deposit (DOT)</label>
            <input
              type="number"
              min="0"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              placeholder="0.00"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* Mint amount */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Mint (pUSD)</label>
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
                onClick={handleSafeMax}
                className="px-3 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-gray-300 transition-colors"
              >
                Safe Max
              </button>
            </div>
          </div>

          {/* Ratio preview */}
          {mintNum > 0 && (
            <div className="bg-gray-800 rounded-lg p-3 flex justify-between items-center">
              <span className="text-sm text-gray-400">Collateral Ratio</span>
              <span className={`font-bold text-sm ${ratioColor}`}>
                {ratio.toFixed(1)}%
                {ratio < 150 && " ⚠ Below min"}
              </span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isLoading || !deposit || !mint || ratio < 150}
            className="w-full bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-semibold transition-colors"
          >
            {isLoading ? "Opening Vault…" : "Approve & Open Vault"}
          </button>

          {error && (
            <p className="text-red-400 text-sm text-center">{error.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
