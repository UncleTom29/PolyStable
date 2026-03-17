"use client";

import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type: ToastType;
  txHash?: string;
  onDismiss: () => void;
}

export function TransactionToast({ message, type, txHash, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const bgColor =
    type === "success"
      ? "bg-green-900 border-green-700"
      : type === "error"
      ? "bg-red-900 border-red-700"
      : "bg-blue-900 border-blue-700";

  const icon = type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️";

  return (
    <div
      className={`fixed bottom-6 right-6 max-w-sm border rounded-xl p-4 shadow-lg z-50 ${bgColor}`}
    >
      <div className="flex items-start gap-3">
        <span>{icon}</span>
        <div className="flex-1">
          <p className="text-sm text-white">{message}</p>
          {txHash && (
            <a
              href={`https://blockscout-passet-hub.parity-testnet.parity.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-300 underline mt-1 block"
            >
              View transaction →
            </a>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-white text-sm ml-2"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<
    Array<{ id: number; message: string; type: ToastType; txHash?: string }>
  >([]);

  const addToast = (message: string, type: ToastType, txHash?: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, txHash }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const ToastContainer = () => (
    <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
      {toasts.map((toast) => (
        <TransactionToast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          txHash={toast.txHash}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );

  return { addToast, ToastContainer };
}
