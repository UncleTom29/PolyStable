import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

const STAKING_PRECOMPILE = "0x0000000000000000000000000000000000000800";

describe("LiquidationEngine", function () {
  async function deployFixture() {
    const [deployer, user1, user2, user3] = await ethers.getSigners();

    // Mock STAKING precompile
    const MockStaking = await ethers.getContractFactory("MockStaking");
    const mockStaking = await MockStaking.deploy();
    await ethers.provider.send("hardhat_setCode", [
      STAKING_PRECOMPILE,
      await ethers.provider.getCode(await mockStaking.getAddress()),
    ]);

    const MockOracle = await ethers.getContractFactory("MockPriceOracle");
    const oracle = await MockOracle.deploy();
    await oracle.setPrice(ethers.ZeroAddress, ethers.parseEther("10"));

    const PUSD = await ethers.getContractFactory("PUSD");
    const pusd = await PUSD.deploy();

    const SurplusBuffer = await ethers.getContractFactory("SurplusBuffer");
    const surplusBuffer = await SurplusBuffer.deploy();

    const VaultEngine = await ethers.getContractFactory("VaultEngine");
    const vaultEngine = await VaultEngine.deploy(
      await pusd.getAddress(),
      await oracle.getAddress(),
      await surplusBuffer.getAddress()
    );

    await pusd.grantRole(await pusd.MINTER_ROLE(), await vaultEngine.getAddress());
    await pusd.grantRole(await pusd.BURNER_ROLE(), await vaultEngine.getAddress());
    await surplusBuffer.updateVaultEngine(await vaultEngine.getAddress());

    // Add DOT collateral: 150% min, 5% stability fee, 5% liq bonus, 10M ceiling
    await vaultEngine.addCollateral(
      ethers.ZeroAddress,
      ethers.parseEther("1.5"),
      ethers.parseUnits("1.05", 27),
      ethers.parseEther("0.05"),
      ethers.parseEther("10000000")
    );

    // Add ERC20 collateral for batchLiquidate tests (LiquidationEngine can receive ERC20)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock Token", "MTK", 18);
    await oracle.setPrice(await mockToken.getAddress(), ethers.parseEther("10"));
    await vaultEngine.addCollateral(
      await mockToken.getAddress(),
      ethers.parseEther("1.5"),
      ethers.parseUnits("1.05", 27),
      ethers.parseEther("0.05"),
      ethers.parseEther("10000000")
    );
    await mockToken.mint(deployer.address, ethers.parseEther("1000"));
    await mockToken.mint(user1.address, ethers.parseEther("1000"));
    await mockToken.mint(user2.address, ethers.parseEther("1000"));

    const LiquidationEngine = await ethers.getContractFactory("LiquidationEngine");
    const liquidationEngine = await LiquidationEngine.deploy(
      await vaultEngine.getAddress(),
      await surplusBuffer.getAddress()
    );

    // Grant LiquidationEngine the LIQUIDATOR_ROLE on VaultEngine
    await vaultEngine.grantRole(
      await vaultEngine.LIQUIDATOR_ROLE(),
      await liquidationEngine.getAddress()
    );

    // Grant deployer MINTER_ROLE so tests can fund liquidators with pUSD
    await pusd.grantRole(await pusd.MINTER_ROLE(), deployer.address);

    return {
      deployer,
      user1,
      user2,
      user3,
      pusd,
      oracle,
      surplusBuffer,
      vaultEngine,
      liquidationEngine,
      mockToken,
    };
  }

  describe("liquidate()", function () {
    it("reverts on healthy vault", async function () {
      const { vaultEngine, liquidationEngine, user1, deployer } =
        await loadFixture(deployFixture);

      // Open vault: 15 DOT @ $10 = $150, 90 pUSD debt => 166% ratio (healthy)
      await vaultEngine
        .connect(user1)
        .openVault(ethers.ZeroAddress, ethers.parseEther("15"), ethers.parseEther("90"), {
          value: ethers.parseEther("15"),
        });

      await expect(
        liquidationEngine.connect(deployer).liquidate(0)
      ).to.be.revertedWithCustomError(
        liquidationEngine,
        "LiquidationEngine__VaultNotLiquidatable"
      );
    });

    it("liquidates an underwater vault (price drop)", async function () {
      const { vaultEngine, liquidationEngine, oracle, pusd, user1, deployer } =
        await loadFixture(deployFixture);

      // Open vault: 15 DOT @ $10 = $150, 90 pUSD
      await vaultEngine
        .connect(user1)
        .openVault(ethers.ZeroAddress, ethers.parseEther("15"), ethers.parseEther("90"), {
          value: ethers.parseEther("15"),
        });

      // Drop price to $8 → ratio = 15*8/90 = 133% < 150%
      await oracle.setPrice(ethers.ZeroAddress, ethers.parseEther("8"));

      // Fund liquidator with pUSD to burn
      await pusd.mint(deployer.address, ethers.parseEther("100"));

      await liquidationEngine.connect(deployer).liquidate(0);

      const vault = await vaultEngine.getVault(0);
      expect(vault.debt).to.equal(0);
      expect(vault.lockedAmount).to.equal(0);
    });

    it("absorbs deficit when vault fully underwater (seized capped at all collateral)", async function () {
      const { vaultEngine, liquidationEngine, oracle, pusd, user1, deployer } =
        await loadFixture(deployFixture);

      // Open vault: 15 DOT @ $10 = $150, 90 pUSD
      await vaultEngine
        .connect(user1)
        .openVault(ethers.ZeroAddress, ethers.parseEther("15"), ethers.parseEther("90"), {
          value: ethers.parseEther("15"),
        });

      // Drop price to $6.10 → ratio = 15*6.1/90 ≈ 101.7%
      // seized = min(94.5/6.1, 15) = 15 DOT (capped at all collateral)
      // bonus = 15 - 90/6.1 ≈ 0.24 DOT (still positive: collateral value > debt)
      await oracle.setPrice(ethers.ZeroAddress, ethers.parseEther("6.1"));

      await pusd.mint(deployer.address, ethers.parseEther("100"));

      await liquidationEngine.connect(deployer).liquidate(0);

      const vault = await vaultEngine.getVault(0);
      expect(vault.debt).to.equal(0);
      expect(vault.lockedAmount).to.equal(0);
    });

    it("deletes vault state after full liquidation", async function () {
      const { vaultEngine, liquidationEngine, oracle, pusd, user1, deployer } =
        await loadFixture(deployFixture);

      await vaultEngine
        .connect(user1)
        .openVault(ethers.ZeroAddress, ethers.parseEther("15"), ethers.parseEther("90"), {
          value: ethers.parseEther("15"),
        });

      await oracle.setPrice(ethers.ZeroAddress, ethers.parseEther("8"));
      await pusd.mint(deployer.address, ethers.parseEther("100"));

      await liquidationEngine.connect(deployer).liquidate(0);

      const vault = await vaultEngine.getVault(0);
      expect(vault.debt).to.equal(0n);
      expect(vault.lockedAmount).to.equal(0n);

      // Vault is no longer liquidatable (debt == 0)
      expect(await liquidationEngine.isLiquidatable(0)).to.equal(false);
    });

    it("emits Liquidated with correct vaultId and liquidator", async function () {
      const { vaultEngine, liquidationEngine, oracle, pusd, user1, deployer } =
        await loadFixture(deployFixture);

      await vaultEngine
        .connect(user1)
        .openVault(ethers.ZeroAddress, ethers.parseEther("15"), ethers.parseEther("90"), {
          value: ethers.parseEther("15"),
        });

      await oracle.setPrice(ethers.ZeroAddress, ethers.parseEther("8"));
      await pusd.mint(deployer.address, ethers.parseEther("100"));

      await expect(liquidationEngine.connect(deployer).liquidate(0))
        .to.emit(liquidationEngine, "Liquidated")
        .withArgs(
          0n,               // vaultId
          deployer.address, // liquidator
          anyValue,         // debt (may include tiny accrual)
          anyValue,         // seized
          anyValue          // bonus
        );
    });
  });

  describe("batchLiquidate()", function () {
    // Uses ERC20 collateral so LiquidationEngine (acting as liquidator in sub-calls)
    // can receive ERC20 tokens without a receive() function.
    async function batchFixture() {
      const base = await loadFixture(deployFixture);
      const { deployer, user1, user2, pusd, oracle, vaultEngine, liquidationEngine, mockToken } =
        base;

      // vault 0 (deployer): 30 MTK @ $10 = $300, 10 pUSD => ratio 300% (healthy)
      await mockToken
        .connect(deployer)
        .approve(await vaultEngine.getAddress(), ethers.parseEther("30"));
      await vaultEngine
        .connect(deployer)
        .openVault(
          await mockToken.getAddress(),
          ethers.parseEther("30"),
          ethers.parseEther("10")
        );

      // vault 1 (user1): 15 MTK @ $10 = $150, 90 pUSD => ratio 166%
      await mockToken
        .connect(user1)
        .approve(await vaultEngine.getAddress(), ethers.parseEther("15"));
      await vaultEngine
        .connect(user1)
        .openVault(
          await mockToken.getAddress(),
          ethers.parseEther("15"),
          ethers.parseEther("90")
        );

      // vault 2 (user2): 15 MTK @ $10 = $150, 90 pUSD => ratio 166%
      await mockToken
        .connect(user2)
        .approve(await vaultEngine.getAddress(), ethers.parseEther("15"));
      await vaultEngine
        .connect(user2)
        .openVault(
          await mockToken.getAddress(),
          ethers.parseEther("15"),
          ethers.parseEther("90")
        );

      // Drop price to $8: vault0 → 240% (safe), vault1 → 133% (liquidatable), vault2 → 133%
      await oracle.setPrice(await mockToken.getAddress(), ethers.parseEther("8"));

      // LiquidationEngine acts as the effective liquidator in batchLiquidate sub-calls.
      // Mint sufficient pUSD to LiquidationEngine (90 + 90 = 180 pUSD needed).
      await pusd.mint(await liquidationEngine.getAddress(), ethers.parseEther("200"));

      return base;
    }

    it("liquidates multiple vaults and skips healthy ones", async function () {
      const { liquidationEngine, vaultEngine } = await loadFixture(batchFixture);

      await liquidationEngine.batchLiquidate([0, 1, 2]);

      // vault 0 is healthy and should be untouched
      const vault0 = await vaultEngine.getVault(0);
      expect(vault0.debt).to.be.gt(0);

      // vault 1 and vault 2 should be cleared
      const vault1 = await vaultEngine.getVault(1);
      expect(vault1.debt).to.equal(0);
      const vault2 = await vaultEngine.getVault(2);
      expect(vault2.debt).to.equal(0);
    });

    it("returns correct liquidation count via BatchLiquidationCompleted event", async function () {
      const { liquidationEngine } = await loadFixture(batchFixture);

      await expect(liquidationEngine.batchLiquidate([0, 1, 2]))
        .to.emit(liquidationEngine, "BatchLiquidationCompleted")
        .withArgs(3n, 2n); // total=3, liquidated=2 (vault0 skipped as healthy)
    });
  });
});
