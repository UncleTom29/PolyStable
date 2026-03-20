"use client";

import { useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { useCallback, useEffect, useState } from "react";
import { type Address, type AbiEvent, parseEventLogs } from "viem";
import {
  vaultEngineConfig,
  pusdConfig,
  VAULT_ENGINE_ABI,
  CONTRACT_ADDRESSES,
} from "@/lib/contracts";
import { MIN_COLLATERAL_RATIO, SAFE_COLLATERAL_RATIO } from "@/lib/constants";
import { formatContractWriteError } from "@/lib/utils";

export interface VaultData {
  id: bigint;
  owner: Address;
  collateral: Address;
  lockedAmount: bigint;
  debt: bigint;
  lastAccrual: bigint;
  ratio: bigint;
  status: "safe" | "warning" | "danger";
}

export function useVault(vaultId: bigint) {
  const { data: vault, isLoading: vaultLoading } = useReadContract({
    ...vaultEngineConfig,
    functionName: "getVault",
    args: [vaultId],
  });

  const { data: ratio, isLoading: ratioLoading } = useReadContract({
    ...vaultEngineConfig,
    functionName: "getCollateralRatio",
    args: [vaultId],
  });

  const status: "safe" | "warning" | "danger" = ratio
    ? Number(ratio) / 1e16 >= SAFE_COLLATERAL_RATIO
      ? "safe"
      : Number(ratio) / 1e16 >= MIN_COLLATERAL_RATIO
      ? "warning"
      : "danger"
    : "safe";

  return {
    vault,
    ratio,
    status,
    isLoading: vaultLoading || ratioLoading,
  };
}

export function useUserVaults(userAddress: Address | undefined) {
  const [vaultIds, setVaultIds] = useState<bigint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const publicClient = usePublicClient();

  useEffect(() => {
    if (!userAddress || !publicClient) return;

    const fetchVaults = async () => {
      setIsLoading(true);
      try {
        const logs = await publicClient.getLogs({
          address: CONTRACT_ADDRESSES.VaultEngine,
          event: VAULT_ENGINE_ABI.find((x) => x.type === "event" && x.name === "VaultOpened") as AbiEvent,
          args: { owner: userAddress },
          fromBlock: 0n,
          toBlock: "latest",
        });
        const ids = logs.map((log) => {
          const parsed = parseEventLogs({
            abi: VAULT_ENGINE_ABI,
            logs: [log],
            eventName: "VaultOpened",
          });
          return parsed[0]?.args.vaultId ?? 0n;
        });
        setVaultIds(ids);
      } catch (err) {
        console.error("Failed to fetch user vaults:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVaults();
  }, [userAddress, publicClient]);

  return { vaultIds, isLoading };
}

export function useOpenVault() {
  const { writeContractAsync, isPending } = useWriteContract();
  const [error, setError] = useState<Error | null>(null);

  const openVault = useCallback(
    async (
      collateral: Address,
      deposit: bigint,
      mintAmount: bigint,
      isNative: boolean
    ) => {
      setError(null);
      try {
        return await writeContractAsync({
          ...vaultEngineConfig,
          functionName: "openVault",
          args: [collateral, deposit, mintAmount],
          value: isNative ? deposit : 0n,
        });
      } catch (err) {
        const formatted = new Error(
          formatContractWriteError(err, {
            fallbackMessage: "Failed to open vault.",
            isNativeVaultAction: isNative,
          })
        );
        setError(formatted);
        throw formatted;
      }
    },
    [writeContractAsync]
  );

  return { openVault, isLoading: isPending, error };
}

export function useDepositCollateral() {
  const { writeContractAsync, isPending, error } = useWriteContract();

  const depositCollateral = useCallback(
    async (vaultId: bigint, amount: bigint, isNative: boolean) => {
      return writeContractAsync({
        ...vaultEngineConfig,
        functionName: "depositCollateral",
        args: [vaultId, amount],
        value: isNative ? amount : 0n,
      });
    },
    [writeContractAsync]
  );

  return { depositCollateral, isLoading: isPending, error };
}

export function useWithdrawCollateral() {
  const { writeContractAsync, isPending, error } = useWriteContract();

  const withdrawCollateral = useCallback(
    async (vaultId: bigint, amount: bigint) => {
      return writeContractAsync({
        ...vaultEngineConfig,
        functionName: "withdrawCollateral",
        args: [vaultId, amount],
      });
    },
    [writeContractAsync]
  );

  return { withdrawCollateral, isLoading: isPending, error };
}

export function useMintPUSD() {
  const { writeContractAsync, isPending, error } = useWriteContract();

  const mintPUSD = useCallback(
    async (vaultId: bigint, amount: bigint) => {
      return writeContractAsync({
        ...vaultEngineConfig,
        functionName: "mintPUSD",
        args: [vaultId, amount],
      });
    },
    [writeContractAsync]
  );

  return { mintPUSD, isLoading: isPending, error };
}

export function useRepayDebt() {
  const { writeContractAsync, isPending, error } = useWriteContract();

  const repayDebt = useCallback(
    async (vaultId: bigint, amount: bigint) => {
      return writeContractAsync({
        ...vaultEngineConfig,
        functionName: "repayDebt",
        args: [vaultId, amount],
      });
    },
    [writeContractAsync]
  );

  return { repayDebt, isLoading: isPending, error };
}

export function useLiquidate(vaultId: bigint) {
  const { writeContractAsync: approveAsync } = useWriteContract();
  const { writeContractAsync: liquidateAsync, isPending, error } = useWriteContract();
  const { data: vault } = useReadContract({
    ...vaultEngineConfig,
    functionName: "getVault",
    args: [vaultId],
  });

  const liquidate = useCallback(
    async (liquidationEngineAddress: Address) => {
      if (!vault) return;
      // Approve pUSD first
      await approveAsync({
        ...pusdConfig,
        functionName: "approve",
        args: [liquidationEngineAddress, vault.debt],
      });
      // Then liquidate
      return liquidateAsync({
        address: liquidationEngineAddress,
        abi: [
          {
            inputs: [{ name: "vaultId", type: "uint256" }],
            name: "liquidate",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ] as const,
        functionName: "liquidate",
        args: [vaultId],
      });
    },
    [approveAsync, liquidateAsync, vault, vaultId]
  );

  return { liquidate, isLoading: isPending, error };
}
