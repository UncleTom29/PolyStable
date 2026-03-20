import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

const STAKING_PRECOMPILE = "0x0000000000000000000000000000000000000800";

describe("VaultEngine", function () {
  async function deployFixture() {
    const [deployer, user1, user2] = await ethers.getSigners();

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

    // DOT collateral: 150% min, 5% fee, 5% bonus, 10M ceiling
    await vaultEngine.addCollateral(
      ethers.ZeroAddress,
      ethers.parseEther("1.5"),
      ethers.parseUnits("1.05", 27),
      ethers.parseEther("0.05"),
      ethers.parseEther("10000000")
    );

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock Token", "MTK", 18);
    await oracle.setPrice(await mockToken.getAddress(), ethers.parseEther("100"));
    await vaultEngine.addCollateral(
      await mockToken.getAddress(),
      ethers.parseEther("1.5"),
      ethers.parseUnits("1.05", 27),
      ethers.parseEther("0.05"),
      ethers.parseEther("10000000")
    );

    return { deployer, user1, user2, pusd, oracle, surplusBuffer, vaultEngine, mockToken };
  }

  describe("openVault", function () {
    it("opens with native DOT, calls STAKING.bond()", async function () {
      const { vaultEngine, user1, pusd } = await loadFixture(deployFixture);
      await vaultEngine.connect(user1).openVault(
        ethers.ZeroAddress,
        ethers.parseEther("15"),
        ethers.parseEther("90"),
        { value: ethers.parseEther("15") }
      );
      const vault = await vaultEngine.getVault(0);
      expect(vault.owner).to.equal(user1.address);
      expect(vault.lockedAmount).to.equal(ethers.parseEther("15"));
      expect(vault.debt).to.equal(ethers.parseEther("90"));
      expect(await pusd.balanceOf(user1.address)).to.equal(ethers.parseEther("90"));
    });

    it("can disable native auto-staking without blocking native vault opens", async function () {
      const { vaultEngine, user1, pusd } = await loadFixture(deployFixture);
      const staking = await ethers.getContractAt("MockStaking", STAKING_PRECOMPILE);

      await vaultEngine.setNativeAutoStakingEnabled(false);
      await vaultEngine.connect(user1).openVault(
        ethers.ZeroAddress,
        ethers.parseEther("15"),
        ethers.parseEther("90"),
        { value: ethers.parseEther("15") }
      );

      expect(await staking.stakedBalances(await vaultEngine.getAddress())).to.equal(0);
      expect(await ethers.provider.getBalance(await vaultEngine.getAddress())).to.equal(ethers.parseEther("15"));
      expect(await pusd.balanceOf(user1.address)).to.equal(ethers.parseEther("90"));
    });

    it("opens with ERC20 collateral", async function () {
      const { vaultEngine, user1, pusd, mockToken } = await loadFixture(deployFixture);
      await mockToken.mint(user1.address, ethers.parseEther("10"));
      await mockToken.connect(user1).approve(await vaultEngine.getAddress(), ethers.parseEther("10"));
      await vaultEngine.connect(user1).openVault(
        await mockToken.getAddress(),
        ethers.parseEther("10"),
        ethers.parseEther("500")
      );
      const vault = await vaultEngine.getVault(0);
      expect(vault.lockedAmount).to.equal(ethers.parseEther("10"));
      expect(await pusd.balanceOf(user1.address)).to.equal(ethers.parseEther("500"));
    });

    it("reverts BelowMinRatio when ratio too low", async function () {
      const { vaultEngine, user1 } = await loadFixture(deployFixture);
      await expect(
        vaultEngine.connect(user1).openVault(
          ethers.ZeroAddress,
          ethers.parseEther("10"),
          ethers.parseEther("90"),
          { value: ethers.parseEther("10") }
        )
      ).to.be.revertedWithCustomError(vaultEngine, "VaultEngine__BelowMinRatio");
    });

    it("reverts DebtCeilingExceeded", async function () {
      const { vaultEngine, user1 } = await loadFixture(deployFixture);
      // Fund user1 with enough native DOT to attempt this large deposit
      await ethers.provider.send("hardhat_setBalance", [
        user1.address,
        "0x" + (BigInt("3000000") * BigInt(10) ** BigInt(18)).toString(16),
      ]);
      await expect(
        vaultEngine.connect(user1).openVault(
          ethers.ZeroAddress,
          ethers.parseEther("2000000"),
          ethers.parseEther("11000000"),
          { value: ethers.parseEther("2000000") }
        )
      ).to.be.revertedWithCustomError(vaultEngine, "VaultEngine__DebtCeilingExceeded");
    });

    it("emits VaultOpened with correct args", async function () {
      const { vaultEngine, user1 } = await loadFixture(deployFixture);
      await expect(
        vaultEngine.connect(user1).openVault(
          ethers.ZeroAddress,
          ethers.parseEther("15"),
          ethers.parseEther("90"),
          { value: ethers.parseEther("15") }
        )
      )
        .to.emit(vaultEngine, "VaultOpened")
        .withArgs(0, user1.address, ethers.ZeroAddress, ethers.parseEther("15"), ethers.parseEther("90"));
    });
  });

  describe("interest accrual", function () {
    it("accrues stability fee over 365 days", async function () {
      const { vaultEngine, user1 } = await loadFixture(deployFixture);
      await vaultEngine.connect(user1).openVault(
        ethers.ZeroAddress,
        ethers.parseEther("30"),
        ethers.parseEther("100"),
        { value: ethers.parseEther("30") }
      );
      const before = (await vaultEngine.getVault(0)).debt;
      await time.increase(365 * 24 * 3600);
      await vaultEngine.connect(user1).mintPUSD(0, ethers.parseEther("1"));
      const after = (await vaultEngine.getVault(0)).debt;
      expect(after).to.be.gt(before + ethers.parseEther("1"));
    });

    it("delta sent to SurplusBuffer", async function () {
      const { vaultEngine, user1, surplusBuffer } = await loadFixture(deployFixture);
      await vaultEngine.connect(user1).openVault(
        ethers.ZeroAddress,
        ethers.parseEther("30"),
        ethers.parseEther("100"),
        { value: ethers.parseEther("30") }
      );
      await time.increase(365 * 24 * 3600);
      const before = await surplusBuffer.surplusBalance();
      await vaultEngine.connect(user1).mintPUSD(0, ethers.parseEther("1"));
      expect(await surplusBuffer.surplusBalance()).to.be.gte(before);
    });

    it("compounds correctly over multiple periods", async function () {
      const { vaultEngine, user1 } = await loadFixture(deployFixture);
      await vaultEngine.connect(user1).openVault(
        ethers.ZeroAddress,
        ethers.parseEther("30"),
        ethers.parseEther("100"),
        { value: ethers.parseEther("30") }
      );
      for (let i = 0; i < 3; i++) {
        await time.increase(30 * 24 * 3600);
        await vaultEngine.connect(user1).mintPUSD(0, ethers.parseEther("0.001"));
      }
      const vault = await vaultEngine.getVault(0);
      expect(vault.debt).to.be.gt(ethers.parseEther("100"));
    });
  });

  describe("staking rewards", function () {
    it("harvestStakingRewards sends DOT to SurplusBuffer", async function () {
      const { vaultEngine, user1 } = await loadFixture(deployFixture);
      await vaultEngine.connect(user1).openVault(
        ethers.ZeroAddress,
        ethers.parseEther("15"),
        ethers.parseEther("90"),
        { value: ethers.parseEther("15") }
      );
      await expect(vaultEngine.harvestStakingRewards()).to.not.be.reverted;
    });

    it("callable by anyone (no role restriction)", async function () {
      const { vaultEngine, user2 } = await loadFixture(deployFixture);
      await expect(vaultEngine.connect(user2).harvestStakingRewards()).to.not.be.reverted;
    });
  });

  describe("withdrawCollateral", function () {
    it("allows withdrawal maintaining min ratio", async function () {
      const { vaultEngine, user1 } = await loadFixture(deployFixture);
      await vaultEngine.connect(user1).openVault(
        ethers.ZeroAddress,
        ethers.parseEther("30"),
        ethers.parseEther("100"),
        { value: ethers.parseEther("30") }
      );
      await expect(vaultEngine.connect(user1).withdrawCollateral(0, ethers.parseEther("10")))
        .to.emit(vaultEngine, "CollateralWithdrawn");
    });

    it("reverts if withdrawal breaks min ratio", async function () {
      const { vaultEngine, user1 } = await loadFixture(deployFixture);
      await vaultEngine.connect(user1).openVault(
        ethers.ZeroAddress,
        ethers.parseEther("15"),
        ethers.parseEther("90"),
        { value: ethers.parseEther("15") }
      );
      await expect(vaultEngine.connect(user1).withdrawCollateral(0, ethers.parseEther("5")))
        .to.be.revertedWithCustomError(vaultEngine, "VaultEngine__BelowMinRatio");
    });
  });
});
