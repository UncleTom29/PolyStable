import { ethers } from "ethers";

const VAULT_ENGINE_ABI = [
  "function harvestStakingRewards()",
];

const STAKING_ABI = [
  "function getPendingRewards(address) view returns (uint256)",
];

const SURPLUS_BUFFER_ABI = [
  "function surplusBalance() view returns (uint256)",
];

const STAKING_PRECOMPILE = "0x0000000000000000000000000000000000000800";
// Minimum reward to harvest: 0.1 DOT
const MIN_HARVEST_THRESHOLD = ethers.parseEther("0.1");

export class StakingRewardsHarvester {
  private vaultEngine: ethers.Contract;
  private staking: ethers.Contract;
  private surplusBuffer: ethers.Contract;
  private signer: ethers.Wallet;
  private vaultEngineAddress: string;
  private stakingReadSupported: boolean | null = null;
  private hasLoggedUnsupportedPrecompile = false;

  constructor(
    signer: ethers.Wallet,
    vaultEngineAddress: string,
    surplusBufferAddress: string
  ) {
    this.signer = signer;
    this.vaultEngineAddress = vaultEngineAddress;
    this.vaultEngine = new ethers.Contract(vaultEngineAddress, VAULT_ENGINE_ABI, signer);
    this.staking = new ethers.Contract(STAKING_PRECOMPILE, STAKING_ABI, signer.provider);
    this.surplusBuffer = new ethers.Contract(surplusBufferAddress, SURPLUS_BUFFER_ABI, signer.provider);
  }

  updateSigner(signer: ethers.Wallet): void {
    this.signer = signer;
    this.vaultEngine = this.vaultEngine.connect(signer) as ethers.Contract;
    this.staking = this.staking.connect(signer.provider!) as ethers.Contract;
    this.surplusBuffer = this.surplusBuffer.connect(signer.provider!) as ethers.Contract;
    this.stakingReadSupported = null;
    this.hasLoggedUnsupportedPrecompile = false;
  }

  async harvest(): Promise<void> {
    try {
      if (this.stakingReadSupported === false) {
        return;
      }

      // Check pending rewards for the VaultEngine address
      let pendingRewards: bigint;
      try {
        pendingRewards = await this.staking.getPendingRewards(this.vaultEngineAddress);
        this.stakingReadSupported = true;
      } catch (err) {
        if (this.isUnsupportedReadError(err)) {
          this.stakingReadSupported = false;
          if (!this.hasLoggedUnsupportedPrecompile) {
            console.warn(
              "[Harvester] Staking rewards precompile read is not supported on this network, disabling harvest checks"
            );
            this.hasLoggedUnsupportedPrecompile = true;
          }
          return;
        }

        throw err;
      }

      if (pendingRewards < MIN_HARVEST_THRESHOLD) {
        console.log(
          `[Harvester] Pending rewards: ${ethers.formatEther(pendingRewards)} DOT (below threshold ${ethers.formatEther(MIN_HARVEST_THRESHOLD)} DOT, skipping)`
        );
        return;
      }

      console.log(
        `[Harvester] Harvesting ${ethers.formatEther(pendingRewards)} DOT in staking rewards...`
      );

      const tx = await this.vaultEngine.harvestStakingRewards();
      const receipt = await tx.wait();

      const newSurplus: bigint = await this.surplusBuffer.surplusBalance();
      console.log(
        `[Harvester] ✅ Harvested ${ethers.formatEther(pendingRewards)} DOT | Surplus buffer: ${ethers.formatEther(newSurplus)} | Tx: ${receipt?.hash}`
      );
    } catch (err) {
      console.error("[Harvester] ❌ Harvest failed:", err);
    }
  }

  private isUnsupportedReadError(err: unknown): boolean {
    if (!(err instanceof Error)) {
      return false;
    }

    const maybeError = err as Error & {
      code?: string;
      value?: string;
      shortMessage?: string;
    };

    return (
      maybeError.code === "BAD_DATA" ||
      maybeError.value === "0x" ||
      maybeError.shortMessage?.includes("could not decode result data") === true
    );
  }
}
