"use client";

import { useState } from "react";
import { type Address } from "viem";
import { useDelegate } from "@/hooks/useGovernance";

interface DelegateModalProps {
  currentDelegatee?: Address;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DelegateModal({ currentDelegatee, onClose, onSuccess }: DelegateModalProps) {
  const { delegate, isLoading, error } = useDelegate();
  const [delegatee, setDelegatee] = useState(currentDelegatee ?? "");

  const handleDelegate = async () => {
    if (!delegatee) return;
    await delegate(delegatee as Address);
    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Delegate pGOV</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          Delegate your pGOV voting power to another address (or yourself).
        </p>

        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">Delegatee Address</label>
          <input
            type="text"
            value={delegatee}
            onChange={(e) => setDelegatee(e.target.value)}
            placeholder="0x..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-pink-500"
          />
        </div>

        <button
          onClick={handleDelegate}
          disabled={isLoading || !delegatee}
          className="w-full bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-semibold transition-colors"
        >
          {isLoading ? "Delegating…" : "Delegate"}
        </button>

        {error && <p className="text-red-400 text-sm text-center mt-3">{error.message}</p>}
      </div>
    </div>
  );
}
