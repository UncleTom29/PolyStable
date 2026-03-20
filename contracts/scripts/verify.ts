import { run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const deploymentsPath = path.join(__dirname, "../deployments/polkadotHubTestnet.json");
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error("Deployment file not found. Run deploy.ts first.");
  }

  const { contracts, deployer } = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));

  const contractsToVerify = [
    { name: "PGOV", constructorArguments: [deployer] },
    { name: "PUSD", constructorArguments: [] },
    { name: "PriceOracle", constructorArguments: [] },
    { name: "SurplusBuffer", constructorArguments: [] },
    {
      name: "PolyStableTimelock",
      constructorArguments: [48 * 3600, [], []],
    },
    {
      name: "VaultEngine",
      constructorArguments: [contracts.PUSD, contracts.PriceOracle, contracts.SurplusBuffer],
    },
    {
      name: "LiquidationEngine",
      constructorArguments: [contracts.VaultEngine, contracts.SurplusBuffer],
    },
    { name: "XCMExecutor", constructorArguments: [] },
    {
      name: "PolyStableGovernor",
      constructorArguments: [contracts.PGOV, contracts.PolyStableTimelock, contracts.XCMExecutor],
    },
  ];

  for (const { name, constructorArguments } of contractsToVerify) {
    const address = contracts[name];
    if (!address) {
      console.warn(`  Skipping ${name}: no address found`);
      continue;
    }
    console.log(`Verifying ${name} at ${address}...`);
    try {
      await run("verify:verify", { address, constructorArguments });
      console.log(`  ✅ ${name} verified`);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("Already Verified")) {
        console.log(`  ℹ️  ${name} already verified`);
      } else {
        console.error(`  ❌ ${name} verification failed:`, err);
      }
    }
  }

  console.log("\nVerification complete.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
