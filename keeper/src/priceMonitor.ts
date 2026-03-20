import { ethers } from "ethers";

const VAULT_ENGINE_ABI = [
  "function getCollateralType(address collateral) view returns (tuple(address token, uint256 minRatio, uint256 stabilityFee, uint256 liquidationBonus, uint256 debtCeiling, uint256 totalDebt, bool active))",
];

const PRICE_ORACLE_ABI = [
  "function getPrice(address collateral) returns (uint256 price18dec, uint8 decimals)",
  "function lastCachedPrice(address collateral) view returns (uint256)",
  "function priceFeeds(address collateral) view returns (address feed, uint8 decimals)",
];

export class PriceMonitor {
  private vaultEngine: ethers.Contract;
  private oracle: ethers.Contract | null = null;
  private signer: ethers.Wallet;
  private latestPrices = new Map<string, number>();
  private hasWarnedMissingOracle = false;

  // Tracked collateral addresses
  private trackedCollaterals: string[] = [
    ethers.ZeroAddress, // native DOT
  ];

  constructor(signer: ethers.Wallet, vaultEngineAddress: string, oracleAddress?: string) {
    this.signer = signer;
    this.vaultEngine = new ethers.Contract(vaultEngineAddress, VAULT_ENGINE_ABI, signer.provider);
    if (oracleAddress) {
      this.oracle = new ethers.Contract(oracleAddress, PRICE_ORACLE_ABI, signer.provider);
    }
  }

  updateSigner(signer: ethers.Wallet): void {
    this.signer = signer;
    this.vaultEngine = this.vaultEngine.connect(signer.provider!) as ethers.Contract;
    if (this.oracle) {
      this.oracle = this.oracle.connect(signer.provider!) as ethers.Contract;
    }
  }

  async checkAllFeeds(): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};

    for (const collateral of this.trackedCollaterals) {
      const usd = await this.checkFeed(collateral);
      if (usd !== null) {
        prices[collateral.toLowerCase()] = usd;
        this.latestPrices.set(collateral.toLowerCase(), usd);
      }
    }

    return prices;
  }

  getLatestPrice(collateral: string): number | null {
    return this.latestPrices.get(collateral.toLowerCase()) ?? null;
  }

  private async checkFeed(collateral: string): Promise<number | null> {
    try {
      const label = collateral === ethers.ZeroAddress ? "DOT" : collateral.slice(0, 8) + "…";

      if (!this.oracle) {
        if (!this.hasWarnedMissingOracle) {
          console.warn("[PriceMonitor] Oracle address not configured, skipping price checks");
          this.hasWarnedMissingOracle = true;
        }
        return null;
      }

      const [feed] = await this.oracle.priceFeeds(collateral);
      if (feed === ethers.ZeroAddress) {
        console.warn(`[PriceMonitor] ${label}: feed not registered in oracle`);
        return null;
      }

      const [price] = await this.oracle.getPrice.staticCall(collateral);
      const cachedPrice: bigint = await this.oracle.lastCachedPrice(collateral);
      const priceUsd = Number(ethers.formatUnits(price, 18));
      const cacheState = cachedPrice > 0n ? "cached" : "uncached";

      console.log(`[PriceMonitor] ${label}: $${priceUsd.toFixed(4)} (${cacheState})`);
      return priceUsd;
    } catch (err) {
      console.error(`[PriceMonitor] ❌ Error checking feed for ${collateral}:`, err);
      return null;
    }
  }
}
