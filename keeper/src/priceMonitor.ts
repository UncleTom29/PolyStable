import { ethers } from "ethers";

const VAULT_ENGINE_ABI = [
  "function getCollateralType(address collateral) view returns (tuple(address token, uint256 minRatio, uint256 stabilityFee, uint256 liquidationBonus, uint256 debtCeiling, uint256 totalDebt, bool active))",
];

const PRICE_ORACLE_ABI = [
  "function getPrice(address collateral) view returns (uint256 price18dec, uint8 decimals)",
  "function lastUpdate(address collateral) view returns (uint256)",
];

// Alert if price not updated in > 1 hour
const STALE_PRICE_THRESHOLD_S = 3600;

export class PriceMonitor {
  private vaultEngine: ethers.Contract;
  private oracle: ethers.Contract | null = null;
  private signer: ethers.Wallet;

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

  async checkAllFeeds(): Promise<void> {
    for (const collateral of this.trackedCollaterals) {
      await this.checkFeed(collateral);
    }
  }

  private async checkFeed(collateral: string): Promise<void> {
    try {
      const label = collateral === ethers.ZeroAddress ? "DOT" : collateral.slice(0, 8) + "…";

      if (this.oracle) {
        // Check via PriceOracle contract
        try {
          const lastUpdate: bigint = await this.oracle.lastUpdate(collateral);
          const now = BigInt(Math.floor(Date.now() / 1000));
          const age = now - lastUpdate;

          if (age > BigInt(STALE_PRICE_THRESHOLD_S)) {
            console.warn(
              `[PriceMonitor] ⚠ STALE PRICE: ${label} not updated for ${age}s (threshold: ${STALE_PRICE_THRESHOLD_S}s)`
            );
          } else {
            const [price] = await this.oracle.getPrice(collateral);
            console.log(
              `[PriceMonitor] ${label}: $${(Number(price) / 1e18).toFixed(4)} (updated ${age}s ago)`
            );
          }
        } catch {
          console.warn(`[PriceMonitor] ⚠ Could not read price for ${label}`);
        }
      } else {
        // Fallback: just log that we checked (oracle address not set)
        console.log(`[PriceMonitor] ${label}: Oracle not configured, skipping price check`);
      }
    } catch (err) {
      console.error(`[PriceMonitor] ❌ Error checking feed for ${collateral}:`, err);
    }
  }
}
