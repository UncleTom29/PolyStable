import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const COINGECKO_DOT_PRICE_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=polkadot&vs_currencies=usd";

async function fetchDotPriceUsd(): Promise<number> {
  const response = await fetch(COINGECKO_DOT_PRICE_URL, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`CoinGecko price fetch failed with status ${response.status}`);
  }

  const data = (await response.json()) as { polkadot?: { usd?: number } };
  const price = data.polkadot?.usd;

  if (!price || !Number.isFinite(price) || price <= 0) {
    throw new Error("CoinGecko returned an invalid DOT/USD price");
  }

  return price;
}

function formatRatioPercent(ratio: bigint): string {
  if (ratio === ethers.MaxUint256) {
    return "UNPRICED";
  }

  return `${(Number(ethers.formatEther(ratio)) * 100).toFixed(1)}%`;
}

async function openVaultBatch(
  vaultEngine: Awaited<ReturnType<typeof ethers.getContractAt>>,
  collateralAddress: string,
  collateralLabel: string,
  dotPrice18: bigint,
  vaultParams: Array<{ label: string; collateralDOT: string; targetRatio: number }>,
  useNativeValue: boolean
): Promise<bigint[]> {
  const vaultIds: bigint[] = [];

  for (const { label, collateralDOT, targetRatio } of vaultParams) {
    const deposit = ethers.parseEther(collateralDOT);
    const mintAmount =
      (deposit * dotPrice18 * 100n) / BigInt(targetRatio) / 10n ** 18n;

    try {
      const tx = await vaultEngine["openVault(address,uint256,uint256)"](
        collateralAddress,
        deposit,
        mintAmount,
        {
          value: useNativeValue ? deposit : 0n,
          gasLimit: 2_500_000,
        }
      );
      const receipt = await tx.wait();

      const event = receipt?.logs.find((log: { topics: string[] }) => {
        try {
          const parsed = vaultEngine.interface.parseLog(
            log as { topics: string[]; data: string }
          );
          return parsed?.name === "VaultOpened";
        } catch {
          return false;
        }
      });

      const vaultId = event
        ? (vaultEngine.interface.parseLog(
            event as { topics: string[]; data: string }
          )?.args[0] as bigint)
        : BigInt(vaultIds.length);
      vaultIds.push(vaultId);

      const ratio = await vaultEngine.getCollateralRatio(vaultId);
      console.log(
        `  Vault ${vaultId}: ${label} ratio | deposit=${collateralDOT} ${collateralLabel} | mint=${ethers.formatEther(
          mintAmount
        )} pUSD | actual ratio=${formatRatioPercent(ratio)}`
      );
    } catch (err) {
      console.error(`  Failed to open vault for ${label}:`, err);
    }
  }

  return vaultIds;
}

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
  const oracle = await ethers.getContractAt("PriceOracle", contracts.PriceOracle);
  const governor = await ethers.getContractAt("PolyStableGovernor", contracts.PolyStableGovernor);

  const dotPriceUsd = await fetchDotPriceUsd();
  const dotPrice8 = ethers.parseUnits(dotPriceUsd.toFixed(8), 8);
  console.log(`Current DOT price from CoinGecko: $${dotPriceUsd.toFixed(4)}`);

  console.log("\nRegistering testnet DOT/USD feed...");
  const MockAggregatorFactory = await ethers.getContractFactory("MockChainlinkAggregator");
  const dotFeed = await MockAggregatorFactory.deploy(
    dotPrice8,
    8,
    "DOT / USD"
  );
  await dotFeed.waitForDeployment();
  const dotFeedAddress = await dotFeed.getAddress();

  await (await oracle.registerFeed(ethers.ZeroAddress, dotFeedAddress)).wait();
  console.log(`  Registered mock DOT/USD feed at ${dotFeedAddress}`);

  await (await oracle.getPrice(ethers.ZeroAddress, { gasLimit: 500_000 })).wait();
  const [dotPrice18] = await oracle.getPrice.staticCall(ethers.ZeroAddress);
  console.log(
    `  Cached oracle DOT price: $${Number(ethers.formatUnits(dotPrice18, 18)).toFixed(4)}`
  );

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
  let vaultIds = await openVaultBatch(
    vaultEngine,
    ethers.ZeroAddress,
    "DOT",
    dotPrice18,
    vaultParams,
    true
  );

  if (vaultIds.length === 0) {
    console.log(
      "\nNative DOT vaults failed on this testnet. Falling back to a mock ERC20 collateral so seeding can still create sample positions."
    );

    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockCollateral = await MockERC20Factory.deploy(
      "Mock DOT",
      "mDOT",
      18
    );
    await mockCollateral.waitForDeployment();
    const mockCollateralAddress = await mockCollateral.getAddress();

    await (await mockCollateral.mint(deployer.address, ethers.parseEther("500"))).wait();
    await (await oracle.registerFeed(mockCollateralAddress, dotFeedAddress)).wait();
    await (await oracle.getPrice(mockCollateralAddress, { gasLimit: 500_000 })).wait();
    await (
      await vaultEngine.addCollateral(
        mockCollateralAddress,
        ethers.parseEther("1.5"),
        ethers.parseUnits("1.05", 27),
        ethers.parseEther("0.05"),
        10_000_000n * 10n ** 18n
      )
    ).wait();
    await (
      await mockCollateral.approve(
        contracts.VaultEngine,
        ethers.MaxUint256
      )
    ).wait();

    const [mockPrice18] = await oracle.getPrice.staticCall(mockCollateralAddress);
    console.log(
      `  Mock collateral deployed to ${mockCollateralAddress} with cached price $${Number(
        ethers.formatUnits(mockPrice18, 18)
      ).toFixed(4)}`
    );

    vaultIds = await openVaultBatch(
      vaultEngine,
      mockCollateralAddress,
      "mDOT",
      dotPrice18,
      vaultParams,
      false
    );
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
  const proposalRunDescription = `${proposalDescription} [seed ${new Date().toISOString()}]`;

  try {
    const proposeTx = await governor.propose(
      [contracts.VaultEngine],
      [0],
      [updateCalldata],
      proposalRunDescription
    );
    const receipt = await proposeTx.wait();
    const proposalEvent = receipt?.logs.find((log: { topics: string[] }) => {
      try {
        const parsed = governor.interface.parseLog(
          log as { topics: string[]; data: string }
        );
        return parsed?.name === "ProposalCreated";
      } catch {
        return false;
      }
    });
    const proposalId = proposalEvent
      ? (governor.interface.parseLog(
          proposalEvent as { topics: string[]; data: string }
        )?.args[0] as bigint)
      : 0n;
    console.log(`  Proposal created. ID: ${proposalId}`);
    console.log(`  Description: "${proposalRunDescription}"`);
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
      const ratioPercent =
        ratio === ethers.MaxUint256 ? Number.POSITIVE_INFINITY : Number(ethers.formatEther(ratio)) * 100;
      const health = ratioPercent >= 175 ? "SAFE  " : ratioPercent >= 150 ? "WARN  " : "DANGER";
      const collateral = ethers.formatEther(vault.lockedAmount).padEnd(14);
      const debt = ethers.formatEther(vault.debt).padEnd(13);
      const ratioStr = formatRatioPercent(ratio).padEnd(12);
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
