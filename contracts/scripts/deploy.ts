import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  console.log("Deploying contracts with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "DOT");

  // ─── 1. PGOV ───────────────────────────────────────────────────────────────
  console.log("\n[1/9] Deploying PGOV...");
  const PGOVFactory = await ethers.getContractFactory("PGOV");
  const pgov = await PGOVFactory.deploy(deployer.address);
  await pgov.waitForDeployment();
  const pgovAddress = await pgov.getAddress();
  console.log("  PGOV deployed to:", pgovAddress);

  // ─── 2. PUSD ───────────────────────────────────────────────────────────────
  console.log("[2/9] Deploying PUSD...");
  const PUSDFactory = await ethers.getContractFactory("PUSD");
  const pusd = await PUSDFactory.deploy();
  await pusd.waitForDeployment();
  const pusdAddress = await pusd.getAddress();
  console.log("  PUSD deployed to:", pusdAddress);

  // ─── 3. PriceOracle ────────────────────────────────────────────────────────
  console.log("[3/9] Deploying PriceOracle...");
  const PriceOracleFactory = await ethers.getContractFactory("PriceOracle");
  const oracle = await PriceOracleFactory.deploy();
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log("  PriceOracle deployed to:", oracleAddress);

  // ─── 4. SurplusBuffer ──────────────────────────────────────────────────────
  console.log("[4/9] Deploying SurplusBuffer...");
  const SurplusBufferFactory = await ethers.getContractFactory("SurplusBuffer");
  const surplusBuffer = await SurplusBufferFactory.deploy();
  await surplusBuffer.waitForDeployment();
  const surplusBufferAddress = await surplusBuffer.getAddress();
  console.log("  SurplusBuffer deployed to:", surplusBufferAddress);

  // ─── 5. PolyStableTimelock ─────────────────────────────────────────────────
  console.log("[5/9] Deploying PolyStableTimelock...");
  const TimelockFactory = await ethers.getContractFactory("PolyStableTimelock");
  const timelock = await TimelockFactory.deploy(
    48 * 3600, // 48 hours
    [],        // proposers (added later)
    []         // executors (added later)
  );
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();
  console.log("  PolyStableTimelock deployed to:", timelockAddress);

  // ─── 6. VaultEngine ────────────────────────────────────────────────────────
  console.log("[6/9] Deploying VaultEngine...");
  const VaultEngineFactory = await ethers.getContractFactory("VaultEngine");
  const vaultEngine = await VaultEngineFactory.deploy(pusdAddress, oracleAddress, surplusBufferAddress);
  await vaultEngine.waitForDeployment();
  const vaultEngineAddress = await vaultEngine.getAddress();
  console.log("  VaultEngine deployed to:", vaultEngineAddress);

  // ─── 7. LiquidationEngine ──────────────────────────────────────────────────
  console.log("[7/9] Deploying LiquidationEngine...");
  const LiquidationEngineFactory = await ethers.getContractFactory("LiquidationEngine");
  const liquidationEngine = await LiquidationEngineFactory.deploy(vaultEngineAddress, surplusBufferAddress);
  await liquidationEngine.waitForDeployment();
  const liquidationEngineAddress = await liquidationEngine.getAddress();
  console.log("  LiquidationEngine deployed to:", liquidationEngineAddress);

  // ─── 8. XCMExecutor ────────────────────────────────────────────────────────
  console.log("[8/9] Deploying XCMExecutor...");
  const XCMExecutorFactory = await ethers.getContractFactory("XCMExecutor");
  const xcmExecutor = await XCMExecutorFactory.deploy();
  await xcmExecutor.waitForDeployment();
  const xcmExecutorAddress = await xcmExecutor.getAddress();
  console.log("  XCMExecutor deployed to:", xcmExecutorAddress);

  // ─── 9. PolyStableGovernor ─────────────────────────────────────────────────
  console.log("[9/9] Deploying PolyStableGovernor...");
  const GovernorFactory = await ethers.getContractFactory("PolyStableGovernor");
  const governor = await GovernorFactory.deploy(pgovAddress, timelockAddress, xcmExecutorAddress);
  await governor.waitForDeployment();
  const governorAddress = await governor.getAddress();
  console.log("  PolyStableGovernor deployed to:", governorAddress);

  // ─── Post-deploy role grants ────────────────────────────────────────────────
  console.log("\nConfiguring roles...");

  const MINTER_ROLE = await pusd.MINTER_ROLE();
  const BURNER_ROLE = await pusd.BURNER_ROLE();
  const LIQUIDATOR_ROLE = await vaultEngine.LIQUIDATOR_ROLE();
  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();
  const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
  const TIMELOCK_ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();

  await (await pusd.grantRole(MINTER_ROLE, vaultEngineAddress)).wait();
  console.log("  PUSD: granted MINTER_ROLE to VaultEngine");

  await (await pusd.grantRole(BURNER_ROLE, vaultEngineAddress)).wait();
  console.log("  PUSD: granted BURNER_ROLE to VaultEngine");

  await (await pusd.grantRole(BURNER_ROLE, liquidationEngineAddress)).wait();
  console.log("  PUSD: granted BURNER_ROLE to LiquidationEngine");

  await (await vaultEngine.grantRole(LIQUIDATOR_ROLE, liquidationEngineAddress)).wait();
  console.log("  VaultEngine: granted LIQUIDATOR_ROLE to LiquidationEngine");

  await (await surplusBuffer.updateVaultEngine(vaultEngineAddress)).wait();
  console.log("  SurplusBuffer: updated VaultEngine");

  await (await timelock.grantRole(PROPOSER_ROLE, governorAddress)).wait();
  console.log("  Timelock: granted PROPOSER_ROLE to Governor");

  await (await timelock.grantRole(CANCELLER_ROLE, governorAddress)).wait();
  console.log("  Timelock: granted CANCELLER_ROLE to Governor");

  await (await timelock.grantRole(EXECUTOR_ROLE, xcmExecutorAddress)).wait();
  console.log("  Timelock: granted EXECUTOR_ROLE to XCMExecutor");

  await (await timelock.grantRole(EXECUTOR_ROLE, ethers.ZeroAddress)).wait();
  console.log("  Timelock: granted EXECUTOR_ROLE to address(0) (open execution)");

  await (await timelock.revokeRole(TIMELOCK_ADMIN_ROLE, deployer.address)).wait();
  console.log("  Timelock: revoked TIMELOCK_ADMIN_ROLE from deployer");

  // Grant XCMExecutor GOVERNOR_ROLE so it can be called by governor
  const GOVERNOR_ROLE = await xcmExecutor.GOVERNOR_ROLE();
  await (await xcmExecutor.grantRole(GOVERNOR_ROLE, governorAddress)).wait();
  console.log("  XCMExecutor: granted GOVERNOR_ROLE to Governor");

  // ─── Register DOT collateral ───────────────────────────────────────────────
  console.log("\nRegistering DOT collateral...");
  await (await vaultEngine.addCollateral(
    ethers.ZeroAddress,             // native DOT
    ethers.parseEther("1.5"),       // 150% min ratio
    ethers.parseUnits("1.05", 27),  // 5% stability fee (ray)
    ethers.parseEther("0.05"),      // 5% liquidation bonus
    10_000_000n * 10n ** 18n        // 10M pUSD debt ceiling
  )).wait();
  console.log("  DOT collateral registered (150% min, 5% fee, 5% bonus, 10M ceiling)");

  // ─── Delegate pGOV ────────────────────────────────────────────────────────
  console.log("\nDelegating pGOV to deployer...");
  await (await pgov.delegate(deployer.address)).wait();
  console.log("  pGOV delegated from deployer to deployer");

  // ─── Save deployment addresses ─────────────────────────────────────────────
  const networkName = network.name === "unknown" ? `chain-${network.chainId}` : network.name;
  const deployments = {
    network: networkName,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      PGOV: pgovAddress,
      PUSD: pusdAddress,
      PriceOracle: oracleAddress,
      SurplusBuffer: surplusBufferAddress,
      PolyStableTimelock: timelockAddress,
      VaultEngine: vaultEngineAddress,
      LiquidationEngine: liquidationEngineAddress,
      XCMExecutor: xcmExecutorAddress,
      PolyStableGovernor: governorAddress,
    },
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  const fileName = networkName === "polkadotHubTestnet" ? "polkadotHubTestnet.json" : `${networkName}.json`;
  const outPath = path.join(deploymentsDir, fileName);
  fs.writeFileSync(outPath, JSON.stringify(deployments, null, 2));
  console.log(`\nDeployment addresses saved to deployments/${fileName}`);

  console.log("\n═══════════════════════════════════════");
  console.log("✅ Deployment complete!");
  console.log("═══════════════════════════════════════");
  Object.entries(deployments.contracts).forEach(([name, addr]) => {
    console.log(`  ${name}: ${addr}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
