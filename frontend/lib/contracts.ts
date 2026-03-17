import { type Address } from "viem";

// ─── ABIs ─────────────────────────────────────────────────────────────────────

export const VAULT_ENGINE_ABI = [
  // Read
  {
    inputs: [{ name: "vaultId", type: "uint256" }],
    name: "getVault",
    outputs: [
      {
        components: [
          { name: "owner", type: "address" },
          { name: "collateral", type: "address" },
          { name: "lockedAmount", type: "uint256" },
          { name: "debt", type: "uint256" },
          { name: "lastAccrual", type: "uint256" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "collateral", type: "address" }],
    name: "getCollateralType",
    outputs: [
      {
        components: [
          { name: "token", type: "address" },
          { name: "minRatio", type: "uint256" },
          { name: "stabilityFee", type: "uint256" },
          { name: "liquidationBonus", type: "uint256" },
          { name: "debtCeiling", type: "uint256" },
          { name: "totalDebt", type: "uint256" },
          { name: "active", type: "bool" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "vaultId", type: "uint256" }],
    name: "getCollateralRatio",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "nextVaultId",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // Write
  {
    inputs: [
      { name: "collateral", type: "address" },
      { name: "deposit", type: "uint256" },
      { name: "mintAmount", type: "uint256" },
    ],
    name: "openVault",
    outputs: [{ name: "vaultId", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { name: "vaultId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    name: "depositCollateral",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { name: "vaultId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    name: "withdrawCollateral",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "vaultId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    name: "mintPUSD",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "vaultId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    name: "repayDebt",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "harvestStakingRewards",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "vaultId", type: "uint256" },
      { indexed: true, name: "owner", type: "address" },
      { indexed: true, name: "collateral", type: "address" },
      { indexed: false, name: "deposit", type: "uint256" },
      { indexed: false, name: "minted", type: "uint256" },
    ],
    name: "VaultOpened",
    type: "event",
  },
] as const;

export const PUSD_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const PGOV_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "getVotes",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "delegates",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "delegatee", type: "address" }],
    name: "delegate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const GOVERNOR_ABI = [
  {
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "description", type: "string" },
    ],
    name: "propose",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "uint8" },
    ],
    name: "castVote",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "uint8" },
      { name: "reason", type: "string" },
    ],
    name: "castVoteWithReason",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "proposalId", type: "uint256" }],
    name: "state",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "descriptionHash", type: "bytes32" },
    ],
    name: "queue",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "descriptionHash", type: "bytes32" },
    ],
    name: "execute",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "proposalId", type: "uint256" },
      { indexed: false, name: "proposer", type: "address" },
      { indexed: false, name: "targets", type: "address[]" },
      { indexed: false, name: "values", type: "uint256[]" },
      { indexed: false, name: "signatures", type: "string[]" },
      { indexed: false, name: "calldatas", type: "bytes[]" },
      { indexed: false, name: "voteStart", type: "uint256" },
      { indexed: false, name: "voteEnd", type: "uint256" },
      { indexed: false, name: "description", type: "string" },
    ],
    name: "ProposalCreated",
    type: "event",
  },
] as const;

export const SURPLUS_BUFFER_ABI = [
  {
    inputs: [],
    name: "surplusBalance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSystemDebt",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getHealth",
    outputs: [{ name: "health", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const LIQUIDATION_ENGINE_ABI = [
  {
    inputs: [{ name: "vaultId", type: "uint256" }],
    name: "isLiquidatable",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "vaultId", type: "uint256" }],
    name: "liquidate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "vaultIds", type: "uint256[]" }],
    name: "batchLiquidate",
    outputs: [{ name: "count", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// ─── Contract addresses (loaded from deployments) ─────────────────────────────
let _addresses: Record<string, Address> = {
  VaultEngine: "0x0000000000000000000000000000000000000000",
  PUSD: "0x0000000000000000000000000000000000000000",
  PGOV: "0x0000000000000000000000000000000000000000",
  PolyStableGovernor: "0x0000000000000000000000000000000000000000",
  SurplusBuffer: "0x0000000000000000000000000000000000000000",
  LiquidationEngine: "0x0000000000000000000000000000000000000000",
};

// In a real deployment, load from the deployments JSON or environment variables
if (typeof window !== "undefined") {
  const envAddresses = {
    VaultEngine: process.env.NEXT_PUBLIC_VAULT_ENGINE_ADDRESS as Address | undefined,
    PUSD: process.env.NEXT_PUBLIC_PUSD_ADDRESS as Address | undefined,
    PGOV: process.env.NEXT_PUBLIC_PGOV_ADDRESS as Address | undefined,
    PolyStableGovernor: process.env.NEXT_PUBLIC_GOVERNOR_ADDRESS as Address | undefined,
    SurplusBuffer: process.env.NEXT_PUBLIC_SURPLUS_BUFFER_ADDRESS as Address | undefined,
    LiquidationEngine: process.env.NEXT_PUBLIC_LIQUIDATION_ENGINE_ADDRESS as Address | undefined,
  };
  Object.entries(envAddresses).forEach(([key, val]) => {
    if (val) _addresses[key] = val;
  });
}

export const CONTRACT_ADDRESSES = _addresses;

export const vaultEngineConfig = {
  address: CONTRACT_ADDRESSES.VaultEngine,
  abi: VAULT_ENGINE_ABI,
} as const;

export const pusdConfig = {
  address: CONTRACT_ADDRESSES.PUSD,
  abi: PUSD_ABI,
} as const;

export const pgovConfig = {
  address: CONTRACT_ADDRESSES.PGOV,
  abi: PGOV_ABI,
} as const;

export const governorConfig = {
  address: CONTRACT_ADDRESSES.PolyStableGovernor,
  abi: GOVERNOR_ABI,
} as const;

export const surplusBufferConfig = {
  address: CONTRACT_ADDRESSES.SurplusBuffer,
  abi: SURPLUS_BUFFER_ABI,
} as const;

export const liquidationEngineConfig = {
  address: CONTRACT_ADDRESSES.LiquidationEngine,
  abi: LIQUIDATION_ENGINE_ABI,
} as const;
