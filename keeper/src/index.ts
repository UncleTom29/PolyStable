import "dotenv/config";
import { ethers } from "ethers";
import { Liquidator } from "./liquidator";
import { StakingRewardsHarvester } from "./stakingRewardsHarvester";
import { PriceMonitor } from "./priceMonitor";

const RPC_URL = process.env.RPC_URL ?? "https://testnet-passet-hub-eth-rpc.polkadot.io";
const KEEPER_PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY;

if (!KEEPER_PRIVATE_KEY) {
  console.error("KEEPER_PRIVATE_KEY not set in environment");
  process.exit(1);
}

// Contract addresses (loaded from env or deployment file)
const VAULT_ENGINE = process.env.VAULT_ENGINE_ADDRESS ?? "";
const LIQUIDATION_ENGINE = process.env.LIQUIDATION_ENGINE_ADDRESS ?? "";
const PUSD = process.env.PUSD_ADDRESS ?? "";
const SURPLUS_BUFFER = process.env.SURPLUS_BUFFER_ADDRESS ?? "";

if (!VAULT_ENGINE || !LIQUIDATION_ENGINE || !PUSD || !SURPLUS_BUFFER) {
  console.error(
    "Missing contract addresses. Set VAULT_ENGINE_ADDRESS, LIQUIDATION_ENGINE_ADDRESS, PUSD_ADDRESS, SURPLUS_BUFFER_ADDRESS"
  );
  process.exit(1);
}

async function createProvider(): Promise<ethers.JsonRpcProvider> {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  await provider.getNetwork();
  return provider;
}

async function main(): Promise<void> {
  console.log("🤖 PolyStable Keeper Bot starting...");
  console.log(`   RPC: ${RPC_URL}`);

  let provider: ethers.JsonRpcProvider;
  let wallet: ethers.Wallet;

  try {
    provider = await createProvider();
    wallet = new ethers.Wallet(KEEPER_PRIVATE_KEY!, provider);
    console.log(`   Keeper address: ${wallet.address}`);
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} DOT`);
  } catch (err) {
    console.error("Failed to connect:", err);
    process.exit(1);
  }

  const liquidator = new Liquidator(wallet, VAULT_ENGINE, LIQUIDATION_ENGINE, PUSD);
  const harvester = new StakingRewardsHarvester(wallet, VAULT_ENGINE, SURPLUS_BUFFER);
  const priceMonitor = new PriceMonitor(wallet, VAULT_ENGINE);

  console.log("\n✅ Connected. Starting main loop (60s interval)...\n");

  const loop = async (): Promise<void> => {
    try {
      // 1. Check price feeds
      await priceMonitor.checkAllFeeds();

      // 2. Scan and liquidate underwater vaults
      const result = await liquidator.scanAndLiquidate();
      console.log(
        `[Liquidator] Scanned: ${result.scanned} | Liquidated: ${result.liquidated} | Profit: $${result.totalProfitUSD.toFixed(2)}`
      );

      // 3. Harvest staking rewards
      await harvester.harvest();
    } catch (err) {
      console.error("[Loop error]", err);

      // Attempt to reconnect on provider errors
      try {
        provider = await createProvider();
        wallet = new ethers.Wallet(KEEPER_PRIVATE_KEY!, provider);
        liquidator.updateSigner(wallet);
        harvester.updateSigner(wallet);
        priceMonitor.updateSigner(wallet);
        console.log("Reconnected after error");
      } catch (reconnErr) {
        console.error("Reconnect failed:", reconnErr);
      }
    }
  };

  // Run immediately, then every 60 seconds
  await loop();
  setInterval(loop, 60_000);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
