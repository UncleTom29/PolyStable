import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("PUSD", function () {
  async function deployFixture() {
    const [deployer, minter, burner, user1, user2] = await ethers.getSigners();

    const PUSD = await ethers.getContractFactory("PUSD");
    const pusd = await PUSD.deploy();

    // Grant roles
    const MINTER_ROLE = await pusd.MINTER_ROLE();
    const BURNER_ROLE = await pusd.BURNER_ROLE();
    await pusd.grantRole(MINTER_ROLE, minter.address);
    await pusd.grantRole(BURNER_ROLE, burner.address);

    return { deployer, minter, burner, user1, user2, pusd, MINTER_ROLE, BURNER_ROLE };
  }

  describe("deployment", function () {
    it("has correct name", async function () {
      const { pusd } = await loadFixture(deployFixture);
      expect(await pusd.name()).to.equal("PolyStable USD");
    });

    it("has correct symbol", async function () {
      const { pusd } = await loadFixture(deployFixture);
      expect(await pusd.symbol()).to.equal("pUSD");
    });

    it("has 18 decimals", async function () {
      const { pusd } = await loadFixture(deployFixture);
      expect(await pusd.decimals()).to.equal(18);
    });

    it("starts with zero total supply", async function () {
      const { pusd } = await loadFixture(deployFixture);
      expect(await pusd.totalSupply()).to.equal(0);
    });
  });

  describe("mint()", function () {
    it("MINTER_ROLE can mint tokens", async function () {
      const { pusd, minter, user1 } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");

      await pusd.connect(minter).mint(user1.address, amount);

      expect(await pusd.balanceOf(user1.address)).to.equal(amount);
      expect(await pusd.totalSupply()).to.equal(amount);
    });

    it("emits Minted event on mint", async function () {
      const { pusd, minter, user1 } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("500");

      await expect(pusd.connect(minter).mint(user1.address, amount))
        .to.emit(pusd, "Minted")
        .withArgs(user1.address, amount);
    });

    it("non-minter cannot mint", async function () {
      const { pusd, user1, user2 } = await loadFixture(deployFixture);

      await expect(
        pusd.connect(user2).mint(user1.address, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(pusd, "AccessControlUnauthorizedAccount");
    });

    it("reverts when minting zero amount", async function () {
      const { pusd, minter, user1 } = await loadFixture(deployFixture);

      await expect(
        pusd.connect(minter).mint(user1.address, 0)
      ).to.be.revertedWithCustomError(pusd, "PUSD__ZeroAmount");
    });
  });

  describe("burn()", function () {
    it("BURNER_ROLE can burn tokens", async function () {
      const { pusd, minter, burner, user1 } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");
      await pusd.connect(minter).mint(user1.address, amount);

      await pusd.connect(burner).burn(user1.address, ethers.parseEther("300"));

      expect(await pusd.balanceOf(user1.address)).to.equal(ethers.parseEther("700"));
    });

    it("emits Burned event on burn", async function () {
      const { pusd, minter, burner, user1 } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");
      await pusd.connect(minter).mint(user1.address, amount);

      await expect(pusd.connect(burner).burn(user1.address, ethers.parseEther("400")))
        .to.emit(pusd, "Burned")
        .withArgs(user1.address, ethers.parseEther("400"));
    });

    it("non-burner cannot burn", async function () {
      const { pusd, minter, user1, user2 } = await loadFixture(deployFixture);
      await pusd.connect(minter).mint(user1.address, ethers.parseEther("100"));

      await expect(
        pusd.connect(user2).burn(user1.address, ethers.parseEther("50"))
      ).to.be.revertedWithCustomError(pusd, "AccessControlUnauthorizedAccount");
    });

    it("reverts when burning zero amount", async function () {
      const { pusd, minter, burner, user1 } = await loadFixture(deployFixture);
      await pusd.connect(minter).mint(user1.address, ethers.parseEther("100"));

      await expect(
        pusd.connect(burner).burn(user1.address, 0)
      ).to.be.revertedWithCustomError(pusd, "PUSD__ZeroAmount");
    });
  });

  describe("max supply cap", function () {
    it("reverts when mint would exceed MAX_SUPPLY", async function () {
      const { pusd, minter, user1 } = await loadFixture(deployFixture);
      const MAX_SUPPLY = await pusd.MAX_SUPPLY();

      // MAX_SUPPLY + 1 wei exceeds the cap
      await expect(
        pusd.connect(minter).mint(user1.address, MAX_SUPPLY + 1n)
      ).to.be.revertedWithCustomError(pusd, "PUSD__MaxSupplyExceeded");
    });

    it("allows minting exactly MAX_PER_ADDRESS", async function () {
      const { pusd, minter, user1 } = await loadFixture(deployFixture);
      const MAX_PER_ADDRESS = await pusd.MAX_PER_ADDRESS(); // 10M pUSD

      await pusd.connect(minter).mint(user1.address, MAX_PER_ADDRESS);
      expect(await pusd.balanceOf(user1.address)).to.equal(MAX_PER_ADDRESS);
    });
  });

  describe("per-address mint cap (10M pUSD)", function () {
    it("reverts when minting would exceed MAX_PER_ADDRESS for an address", async function () {
      const { pusd, minter, user1 } = await loadFixture(deployFixture);
      const MAX_PER_ADDRESS = await pusd.MAX_PER_ADDRESS();

      // 1 wei over the 10M limit
      await expect(
        pusd.connect(minter).mint(user1.address, MAX_PER_ADDRESS + 1n)
      ).to.be.revertedWithCustomError(pusd, "PUSD__MaxPerAddressExceeded");
    });

    it("reverts on a second mint that pushes balance over cap", async function () {
      const { pusd, minter, user1 } = await loadFixture(deployFixture);
      const MAX_PER_ADDRESS = await pusd.MAX_PER_ADDRESS();

      await pusd.connect(minter).mint(user1.address, MAX_PER_ADDRESS);

      await expect(
        pusd.connect(minter).mint(user1.address, 1n)
      ).to.be.revertedWithCustomError(pusd, "PUSD__MaxPerAddressExceeded");
    });

    it("cap is per-address: different addresses can each hold up to 10M", async function () {
      const { pusd, minter, user1, user2 } = await loadFixture(deployFixture);
      const MAX_PER_ADDRESS = await pusd.MAX_PER_ADDRESS();

      await pusd.connect(minter).mint(user1.address, MAX_PER_ADDRESS);
      await pusd.connect(minter).mint(user2.address, MAX_PER_ADDRESS);

      expect(await pusd.balanceOf(user1.address)).to.equal(MAX_PER_ADDRESS);
      expect(await pusd.balanceOf(user2.address)).to.equal(MAX_PER_ADDRESS);
    });
  });

  describe("ERC20Permit", function () {
    it("returns a valid domain separator", async function () {
      const { pusd } = await loadFixture(deployFixture);
      const { chainId } = await ethers.provider.getNetwork();

      const expectedDomainSeparator = ethers.TypedDataEncoder.hashDomain({
        name: "PolyStable USD",
        version: "1",
        chainId: chainId,
        verifyingContract: await pusd.getAddress(),
      });

      expect(await pusd.DOMAIN_SEPARATOR()).to.equal(expectedDomainSeparator);
    });

    it("permit() allows gasless approval via signature", async function () {
      const { pusd, minter, user1, user2 } = await loadFixture(deployFixture);

      await pusd.connect(minter).mint(user1.address, ethers.parseEther("1000"));

      const { chainId } = await ethers.provider.getNetwork();
      const deadline = (await time.latest()) + 3600;
      const nonce = await pusd.nonces(user1.address);
      const spenderAddress = user2.address;
      const permitAmount = ethers.parseEther("500");

      const domain = {
        name: "PolyStable USD",
        version: "1",
        chainId: chainId,
        verifyingContract: await pusd.getAddress(),
      };
      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };
      const permitValues = {
        owner: user1.address,
        spender: spenderAddress,
        value: permitAmount,
        nonce: nonce,
        deadline: deadline,
      };

      const sig = await user1.signTypedData(domain, types, permitValues);
      const { v, r, s } = ethers.Signature.from(sig);

      await pusd.permit(user1.address, spenderAddress, permitAmount, deadline, v, r, s);

      expect(await pusd.allowance(user1.address, spenderAddress)).to.equal(permitAmount);
    });

    it("permit() reverts with an expired deadline", async function () {
      const { pusd, minter, user1, user2 } = await loadFixture(deployFixture);
      await pusd.connect(minter).mint(user1.address, ethers.parseEther("100"));

      const { chainId } = await ethers.provider.getNetwork();
      const expiredDeadline = (await time.latest()) - 1; // already expired
      const nonce = await pusd.nonces(user1.address);

      const domain = {
        name: "PolyStable USD",
        version: "1",
        chainId: chainId,
        verifyingContract: await pusd.getAddress(),
      };
      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };
      const permitValues = {
        owner: user1.address,
        spender: user2.address,
        value: ethers.parseEther("50"),
        nonce: nonce,
        deadline: expiredDeadline,
      };

      const sig = await user1.signTypedData(domain, types, permitValues);
      const { v, r, s } = ethers.Signature.from(sig);

      await expect(
        pusd.permit(user1.address, user2.address, ethers.parseEther("50"), expiredDeadline, v, r, s)
      ).to.be.revertedWithCustomError(pusd, "ERC2612ExpiredSignature");
    });
  });

  describe("AccessControl", function () {
    it("deployer has DEFAULT_ADMIN_ROLE", async function () {
      const { pusd, deployer } = await loadFixture(deployFixture);
      const DEFAULT_ADMIN_ROLE = await pusd.DEFAULT_ADMIN_ROLE();
      expect(await pusd.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)).to.be.true;
    });

    it("admin can grant MINTER_ROLE to another account", async function () {
      const { pusd, deployer, user1 } = await loadFixture(deployFixture);
      const MINTER_ROLE = await pusd.MINTER_ROLE();

      await pusd.connect(deployer).grantRole(MINTER_ROLE, user1.address);

      expect(await pusd.hasRole(MINTER_ROLE, user1.address)).to.be.true;
    });

    it("admin can revoke MINTER_ROLE", async function () {
      const { pusd, deployer, minter, MINTER_ROLE } = await loadFixture(deployFixture);

      await pusd.connect(deployer).revokeRole(MINTER_ROLE, minter.address);

      expect(await pusd.hasRole(MINTER_ROLE, minter.address)).to.be.false;
      await expect(
        pusd.connect(minter).mint(deployer.address, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(pusd, "AccessControlUnauthorizedAccount");
    });

    it("admin can grant BURNER_ROLE to another account", async function () {
      const { pusd, deployer, user2, BURNER_ROLE } = await loadFixture(deployFixture);

      await pusd.connect(deployer).grantRole(BURNER_ROLE, user2.address);

      expect(await pusd.hasRole(BURNER_ROLE, user2.address)).to.be.true;
    });

    it("non-admin cannot grant roles", async function () {
      const { pusd, user1, user2, MINTER_ROLE } = await loadFixture(deployFixture);

      await expect(
        pusd.connect(user1).grantRole(MINTER_ROLE, user2.address)
      ).to.be.revertedWithCustomError(pusd, "AccessControlUnauthorizedAccount");
    });
  });
});
