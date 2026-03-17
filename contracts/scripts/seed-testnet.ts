import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Seeding testnet with account:", deployer.address);

  // Load deployment addresses
  const deploymentsPath = path.join(__dirname, "../deployments/polkadotHubTestnet.json");
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error("Deployment file not found. Run deploy.ts first.");
  }
  const { contracts } = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));

  const vaultEngine = await ethers.getContractAt("VaultEngine", contracts.VaultEngine);
  const pusd = await ethers.getContractAt("PUSD", contracts.PUSD);
  const pgov = await ethers.getContractAt("PGOV", contracts.PGOV);
  const governor = await ethers.getContractAt("PolyStableGovernor", contracts.PolyStableGovernor);

  // DOT price (for ratio calculations): assume $10
  const DOT_PRICE = 10n;

  // Target ratios and their corresponding vault params (collateral DOT, mint pUSD)
  // ratio = (locked * price) / debt  =>  debt = (locked * price) / ratio
  const vaultParams: Array<{ label: string; collateralDOT: string; targetRatio: number }> = [
    { label: "200%", collateralDOT: "20", targetRatio: 200 },
    { label: "180%", collateralDOT: "18", targetRatio: 180 },
    { label: "155%", collateralDOT: "15.5", targetRatio: 155 },
    { label: "152%", collateralDOT: "15.2", targetRatio: 152 },
    { label: "300%", collateralDOT: "30", targetRatio: 300 },
  ];

  console.log("\nOpening 5 vaults...");
  const vaultIds: bigint[] = [];

  for (const { label, collateralDOT, targetRatio } of vaultParams) {
    const deposit = ethers.parseEther(collateralDOT);
    // debt = deposit * DOT_PRICE * 100 / targetRatio  (in ether units)
    const mintAmount = (deposit * DOT_PRICE * 100n) / BigInt(targetRatio);

    try {
      const tx = await vaultEngine.openVault(
        ethers.ZeroAddress,
        deposit,
        mintAmount,
        { value: deposit }
      );
      const receipt = await tx.wait();

      // Get vault ID from event
      const event = receipt?.logs.find((log: { topics: string[] }) => {
        try {
          const parsed = vaultEngine.interface.parseLog(log as { topics: string[]; data: string });
          return parsed?.name === "VaultOpened";
        } catch {
          return false;
        }
      });
      const vaultId = event
        ? (vaultEngine.interface.parseLog(event as { topics: string[]; data: string })?.args[0] as bigint)
        : BigInt(vaultIds.length);
      vaultIds.push(vaultId);

      const ratio = await vaultEngine.getCollateralRatio(vaultId);
      console.log(`  Vault ${vaultId}: ${label} ratio | deposit=${collateralDOT} DOT | mint=${ethers.formatEther(mintAmount)} pUSD | actual ratio=${ethers.formatEther(ratio) + "x" }`);
    } catch (err) {
      console.error(`  Failed to open vault for ${label}:`, err);
    }
  }

  // ─── Create governance proposal ───────────────────────────────────────────
  console.log("\nCreating governance proposal: 'Increase DOT debt ceiling to 20M pUSD'...");

  // Encode VaultEngine.updateCollateral() calldata
  const currentCT = await vaultEngine.getCollateralType(ethers.ZeroAddress);
  const updateCalldata = vaultEngine.interface.encodeFunctionData("updateCollateral", [
    ethers.ZeroAddress,
    currentCT.minRatio,
    currentCT.stabilityFee,
    currentCT.liquidationBonus,
    20_000_000n * 10n ** 18n, // new ceiling: 20M
    currentCT.active,
  ]);

  const proposalDescription = "Increase DOT debt ceiling to 20M pUSD";

  try {
    const proposeTx = await governor.propose(
      [contracts.VaultEngine],
      [0],
      [updateCalldata],
      proposalDescription
    );
    const receipt = await proposeTx.wait();
    const proposalId = receipt?.logs[0]
      ? BigInt(receipt.logs[0].topics[1] ?? 0)
      : 0n;
    console.log(`  Proposal created. ID: ${proposalId}`);
    console.log(`  Description: "${proposalDescription}"`);
  } catch (err) {
    console.error("  Failed to create proposal:", err);
  }

  // ─── Print vault summary table ────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════════════════╗");
  console.log("║                    VAULT SUMMARY TABLE                          ║");
  console.log("╠═══════╦════════════════╦═══════════════╦══════════════╦═════════╣");
  console.log("║ VaultId║ Collateral(DOT)║ Debt(pUSD)    ║ Ratio        ║ Health  ║");
  console.log("╠═══════╬════════════════╬═══════════════╬══════════════╬═════════╣");

  for (const vaultId of vaultIds) {
    try {
      const vault = await vaultEngine.getVault(vaultId);
      const ratio = await vaultEngine.getCollateralRatio(vaultId);
      const ratioPercent = Number(ethers.formatEther(ratio)) * 100;
      const health = ratioPercent >= 175 ? "SAFE  " : ratioPercent >= 150 ? "WARN  " : "DANGER";
      const collateral = ethers.formatEther(vault.lockedAmount).padEnd(14);
      const debt = ethers.formatEther(vault.debt).padEnd(13);
      const ratioStr = ratioPercent.toFixed(1).padEnd(12);
      console.log(`║ ${vaultId}     ║ ${collateral} ║ ${debt} ║ ${ratioStr} ║ ${health} ║`);
    } catch (err) {
      console.log(`║ ${vaultId}     ║ ERROR                                                   ║`);
    }
  }

  console.log("╚═══════╩════════════════╩═══════════════╩══════════════╩═════════╝");
  console.log("\nTestnet seeding complete!");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
