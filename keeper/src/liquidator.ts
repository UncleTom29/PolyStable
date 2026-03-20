import { ethers } from "ethers";

// Minimal ABIs for keeper operations
const VAULT_ENGINE_ABI = [
  "function getVault(uint256 vaultId) view returns (tuple(address owner, address collateral, uint256 lockedAmount, uint256 debt, uint256 lastAccrual))",
  "function nextVaultId() view returns (uint256)",
  "event VaultOpened(uint256 indexed vaultId, address indexed owner, address indexed collateral, uint256 deposit, uint256 minted)",
];

const LIQUIDATION_ENGINE_ABI = [
  "function isLiquidatable(uint256 vaultId) view returns (bool)",
  "function liquidate(uint256 vaultId)",
];

const PUSD_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

export interface LiquidationResult {
  scanned: number;
  liquidated: number;
  totalProfitUSD: number;
}

export class Liquidator {
  private vaultEngine: ethers.Contract;
  private liquidationEngine: ethers.Contract;
  private pusd: ethers.Contract;
  private signer: ethers.Wallet;

  private dotPriceUSD: number | null = null;
  // Liquidation bonus: 5%
  private LIQUIDATION_BONUS = 0.05;

  constructor(
    signer: ethers.Wallet,
    vaultEngineAddress: string,
    liquidationEngineAddress: string,
    pusdAddress: string
  ) {
    this.signer = signer;
    this.vaultEngine = new ethers.Contract(vaultEngineAddress, VAULT_ENGINE_ABI, signer);
    this.liquidationEngine = new ethers.Contract(
      liquidationEngineAddress,
      LIQUIDATION_ENGINE_ABI,
      signer
    );
    this.pusd = new ethers.Contract(pusdAddress, PUSD_ABI, signer);
  }

  updateSigner(signer: ethers.Wallet): void {
    this.signer = signer;
    this.vaultEngine = this.vaultEngine.connect(signer) as ethers.Contract;
    this.liquidationEngine = this.liquidationEngine.connect(signer) as ethers.Contract;
    this.pusd = this.pusd.connect(signer) as ethers.Contract;
  }

  setDotPriceUSD(priceUsd: number): void {
    if (Number.isFinite(priceUsd) && priceUsd > 0) {
      this.dotPriceUSD = priceUsd;
    }
  }

  async scanAndLiquidate(): Promise<LiquidationResult> {
    const result: LiquidationResult = { scanned: 0, liquidated: 0, totalProfitUSD: 0 };

    // Get all vault IDs from VaultOpened events
    const filter = this.vaultEngine.filters["VaultOpened"]();
    const events = await this.vaultEngine.queryFilter(filter, 0, "latest");
    const vaultIds: bigint[] = [
      ...new Set(events.map((e) => (e as ethers.EventLog).args[0] as bigint)),
    ];

    result.scanned = vaultIds.length;
    console.log(`[Liquidator] Scanning ${vaultIds.length} vaults...`);

    // Check each vault
    for (const vaultId of vaultIds) {
      try {
        const isLiquidatable: boolean = await this.liquidationEngine.isLiquidatable(vaultId);
        if (!isLiquidatable) continue;

        const vault = await this.vaultEngine.getVault(vaultId);
        const debt = vault.debt as bigint;

        if (debt === 0n) continue;

        // Check keeper pUSD balance
        const keeperBalance: bigint = await this.pusd.balanceOf(this.signer.address);
        if (keeperBalance < debt) {
          console.log(
            `[Liquidator] Skipping vault ${vaultId}: insufficient pUSD (have ${ethers.formatEther(keeperBalance)}, need ${ethers.formatEther(debt)})`
          );
          continue;
        }

        // Approve pUSD for liquidation engine
        const approveTx = await this.pusd.approve(
          await this.liquidationEngine.getAddress(),
          debt
        );
        await approveTx.wait();

        // Execute liquidation
        const liquidateTx = await this.liquidationEngine.liquidate(vaultId);
        const receipt = await liquidateTx.wait();

        const seizedDOT = vault.lockedAmount as bigint;
        const collateralLabel =
          vault.collateral === ethers.ZeroAddress
            ? "DOT"
            : `${String(vault.collateral).slice(0, 6)}…`;
        const seizedUSD =
          this.dotPriceUSD === null ? 0 : (Number(seizedDOT) / 1e18) * this.dotPriceUSD;
        // Profit = bonus portion of seized collateral (5% of seized value)
        const profit = seizedUSD * this.LIQUIDATION_BONUS;
        const profitLabel =
          this.dotPriceUSD === null ? "n/a (price unavailable)" : `$${profit.toFixed(2)}`;

        result.liquidated++;
        result.totalProfitUSD += profit;

        console.log(
          `[Liquidator] ✅ Liquidated vault ${vaultId} | Debt: ${ethers.formatEther(debt)} pUSD | Seized: ${ethers.formatEther(seizedDOT)} ${collateralLabel} | Est. profit: ${profitLabel} | Tx: ${receipt?.hash}`
        );
      } catch (err) {
        console.error(`[Liquidator] ❌ Failed to liquidate vault ${vaultId}:`, err);
      }
    }

    return result;
  }
}
