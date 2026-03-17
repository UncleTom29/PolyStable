"use client";

import { useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { useCallback, useEffect, useState } from "react";
import { type Address, keccak256, toHex, encodeFunctionData } from "viem";
import {
  governorConfig,
  pgovConfig,
  vaultEngineConfig,
  GOVERNOR_ABI,
  CONTRACT_ADDRESSES,
} from "@/lib/contracts";

export enum ProposalState {
  Pending,
  Active,
  Canceled,
  Defeated,
  Succeeded,
  Queued,
  Expired,
  Executed,
}

export interface Proposal {
  id: bigint;
  proposer: Address;
  targets: Address[];
  values: bigint[];
  calldatas: `0x${string}`[];
  description: string;
  voteStart: bigint;
  voteEnd: bigint;
  state: ProposalState;
}

export function useProposals() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const publicClient = usePublicClient();

  useEffect(() => {
    if (!publicClient) return;

    const fetchProposals = async () => {
      setIsLoading(true);
      try {
        const logs = await publicClient.getLogs({
          address: CONTRACT_ADDRESSES.PolyStableGovernor,
          event: GOVERNOR_ABI.find(
            (x) => x.type === "event" && x.name === "ProposalCreated"
          ) as Parameters<typeof publicClient.getLogs>[0]["event"],
          fromBlock: 0n,
          toBlock: "latest",
        });

        const proposalList: Proposal[] = logs.map((log) => {
          const args = (log as { args?: Record<string, unknown> }).args ?? {};
          return {
            id: (args["proposalId"] as bigint) ?? 0n,
            proposer: (args["proposer"] as Address) ?? "0x0000000000000000000000000000000000000000",
            targets: (args["targets"] as Address[]) ?? [],
            values: (args["values"] as bigint[]) ?? [],
            calldatas: (args["calldatas"] as `0x${string}`[]) ?? [],
            description: (args["description"] as string) ?? "",
            voteStart: (args["voteStart"] as bigint) ?? 0n,
            voteEnd: (args["voteEnd"] as bigint) ?? 0n,
            state: ProposalState.Pending,
          };
        });

        setProposals(proposalList);
      } catch (err) {
        console.error("Failed to fetch proposals:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProposals();
  }, [publicClient]);

  return { proposals, isLoading };
}

export function useProposalState(proposalId: bigint) {
  return useReadContract({
    ...governorConfig,
    functionName: "state",
    args: [proposalId],
  });
}

export function useVote(proposalId: bigint) {
  const { writeContractAsync, isPending, error } = useWriteContract();

  const castVote = useCallback(
    async (support: 0 | 1 | 2, reason?: string) => {
      if (reason) {
        return writeContractAsync({
          ...governorConfig,
          functionName: "castVoteWithReason",
          args: [proposalId, support, reason],
        });
      }
      return writeContractAsync({
        ...governorConfig,
        functionName: "castVote",
        args: [proposalId, support],
      });
    },
    [writeContractAsync, proposalId]
  );

  return { castVote, isLoading: isPending, error };
}

export function useDelegate() {
  const { writeContractAsync, isPending, error } = useWriteContract();

  const delegate = useCallback(
    async (delegatee: Address) => {
      return writeContractAsync({
        ...pgovConfig,
        functionName: "delegate",
        args: [delegatee],
      });
    },
    [writeContractAsync]
  );

  return { delegate, isLoading: isPending, error };
}

export function useCreateProposal() {
  const { writeContractAsync, isPending, error } = useWriteContract();

  const createDebtCeilingProposal = useCallback(
    async (newCeiling: bigint) => {
      // Get current collateral type data first (simplified: use known values)
      const updateCalldata = encodeFunctionData({
        abi: vaultEngineConfig.abi,
        functionName: "updateCollateral" as never,
        args: [
          "0x0000000000000000000000000000000000000000", // native DOT
          BigInt("1500000000000000000"),  // 150% minRatio
          BigInt("1050000000000000000000000000"), // 5% stability fee
          BigInt("50000000000000000"),    // 5% liquidation bonus
          newCeiling,
          true,
        ],
      } as never);

      const description = `Increase DOT debt ceiling to ${newCeiling / 10n ** 18n}M pUSD`;

      return writeContractAsync({
        ...governorConfig,
        functionName: "propose",
        args: [
          [CONTRACT_ADDRESSES.VaultEngine],
          [0n],
          [updateCalldata],
          description,
        ],
      });
    },
    [writeContractAsync]
  );

  return { createDebtCeilingProposal, isLoading: isPending, error };
}

export function useVotingPower(address: Address | undefined) {
  return useReadContract({
    ...pgovConfig,
    functionName: "getVotes",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useDelegatee(address: Address | undefined) {
  return useReadContract({
    ...pgovConfig,
    functionName: "delegates",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}
