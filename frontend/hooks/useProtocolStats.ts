"use client";

import { useReadContracts } from "wagmi";
import { vaultEngineConfig, pusdConfig, surplusBufferConfig } from "@/lib/contracts";

export interface ProtocolStats {
  totalPUSDSupply: bigint;
  totalVaults: bigint;
  surplusBalance: bigint;
  systemDebt: bigint;
  systemHealth: bigint;
  isLoading: boolean;
}

export function useProtocolStats(): ProtocolStats {
  const { data, isLoading } = useReadContracts({
    contracts: [
      {
        ...pusdConfig,
        functionName: "totalSupply",
      },
      {
        ...vaultEngineConfig,
        functionName: "nextVaultId",
      },
      {
        ...surplusBufferConfig,
        functionName: "surplusBalance",
      },
      {
        ...surplusBufferConfig,
        functionName: "totalSystemDebt",
      },
      {
        ...surplusBufferConfig,
        functionName: "getHealth",
      },
    ],
    query: {
      refetchInterval: 15_000,
    },
  });

  const [
    totalPUSDSupply,
    totalVaults,
    surplusBalance,
    systemDebt,
    systemHealth,
  ] = data ?? [];

  return {
    totalPUSDSupply: (totalPUSDSupply?.result as bigint | undefined) ?? 0n,
    totalVaults: (totalVaults?.result as bigint | undefined) ?? 0n,
    surplusBalance: (surplusBalance?.result as bigint | undefined) ?? 0n,
    systemDebt: (systemDebt?.result as bigint | undefined) ?? 0n,
    systemHealth: (systemHealth?.result as bigint | undefined) ?? 0n,
    isLoading,
  };
}