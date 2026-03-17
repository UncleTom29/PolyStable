import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

const XCM_PRECOMPILE = "0x0000000000000000000000000000000000000804";

describe("XCMExecutor", function () {
  async function deployFixture() {
    const [deployer, governor, user1] = await ethers.getSigners();

    // Mock XCM precompile so sendXCM calls don't revert
    const MockXCM = await ethers.getContractFactory("MockXCM");
    const mockXCM = await MockXCM.deploy();
    await ethers.provider.send("hardhat_setCode", [
      XCM_PRECOMPILE,
      await ethers.provider.getCode(await mockXCM.getAddress()),
    ]);

    const XCMExecutor = await ethers.getContractFactory("XCMExecutor");
    const xcmExecutor = await XCMExecutor.deploy();

    // Grant governor account the GOVERNOR_ROLE
    const GOVERNOR_ROLE = await xcmExecutor.GOVERNOR_ROLE();
    await xcmExecutor.grantRole(GOVERNOR_ROLE, governor.address);

    // A simple parachain endpoint for tests
    const hubPlaceholder = ethers.getAddress("0x" + "11".repeat(20));
    const paraId = ethers.encodeBytes32String("para-1000");
    const dest = {
      parents: 1,
      interior: [ethers.hexlify(ethers.toUtf8Bytes("para1000"))],
    };
    const endpoint = {
      paraId,
      dest,
      active: true,
    };

    return {
      deployer,
      governor,
      user1,
      xcmExecutor,
      GOVERNOR_ROLE,
      hubPlaceholder,
      endpoint,
    };
  }

  describe("registerEndpoint()", function () {
    it("GOVERNOR_ROLE can register a parachain endpoint", async function () {
      const { xcmExecutor, governor, hubPlaceholder, endpoint } =
        await loadFixture(deployFixture);

      await xcmExecutor.connect(governor).registerEndpoint(hubPlaceholder, endpoint);

      const stored = await xcmExecutor.parachainRegistry(hubPlaceholder);
      expect(stored.active).to.be.true;
      expect(stored.paraId).to.equal(endpoint.paraId);
    });

    it("emits EndpointRegistered on registration", async function () {
      const { xcmExecutor, governor, hubPlaceholder, endpoint } =
        await loadFixture(deployFixture);

      await expect(xcmExecutor.connect(governor).registerEndpoint(hubPlaceholder, endpoint))
        .to.emit(xcmExecutor, "EndpointRegistered")
        .withArgs(hubPlaceholder, endpoint.paraId);
    });

    it("non-GOVERNOR_ROLE cannot register an endpoint", async function () {
      const { xcmExecutor, user1, hubPlaceholder, endpoint } =
        await loadFixture(deployFixture);

      await expect(
        xcmExecutor.connect(user1).registerEndpoint(hubPlaceholder, endpoint)
      ).to.be.revertedWithCustomError(xcmExecutor, "AccessControlUnauthorizedAccount");
    });

    it("reverts when hubPlaceholder is the zero address", async function () {
      const { xcmExecutor, governor, endpoint } = await loadFixture(deployFixture);

      await expect(
        xcmExecutor.connect(governor).registerEndpoint(ethers.ZeroAddress, endpoint)
      ).to.be.revertedWithCustomError(xcmExecutor, "XCMExecutor__ZeroAddress");
    });

    it("isEndpointActive returns true after registration", async function () {
      const { xcmExecutor, governor, hubPlaceholder, endpoint } =
        await loadFixture(deployFixture);

      expect(await xcmExecutor.isEndpointActive(hubPlaceholder)).to.be.false;

      await xcmExecutor.connect(governor).registerEndpoint(hubPlaceholder, endpoint);

      expect(await xcmExecutor.isEndpointActive(hubPlaceholder)).to.be.true;
    });
  });

  describe("execute() — XCM dispatch", function () {
    it("dispatches XCM and emits XCMDispatched for a registered parachain target", async function () {
      const { xcmExecutor, governor, hubPlaceholder, endpoint } =
        await loadFixture(deployFixture);

      await xcmExecutor.connect(governor).registerEndpoint(hubPlaceholder, endpoint);

      const calldata = "0xdeadbeef";
      await expect(
        xcmExecutor
          .connect(governor)
          .execute([hubPlaceholder], [0n], [calldata], ethers.ZeroHash)
      )
        .to.emit(xcmExecutor, "XCMDispatched")
        .withArgs(hubPlaceholder, endpoint.paraId, ethers.keccak256(calldata));
    });

    it("does NOT emit LocalExecuted for a registered parachain target", async function () {
      const { xcmExecutor, governor, hubPlaceholder, endpoint } =
        await loadFixture(deployFixture);

      await xcmExecutor.connect(governor).registerEndpoint(hubPlaceholder, endpoint);

      const tx = await xcmExecutor
        .connect(governor)
        .execute([hubPlaceholder], [0n], ["0xdeadbeef"], ethers.ZeroHash);
      const receipt = await tx.wait();

      const localExecutedTopic = xcmExecutor.interface.getEvent("LocalExecuted").topicHash;
      const hasLocalExecuted = receipt!.logs.some(
        (log) => log.topics[0] === localExecutedTopic
      );
      expect(hasLocalExecuted).to.be.false;
    });
  });

  describe("execute() — local execution", function () {
    it("executes locally and emits LocalExecuted for a non-parachain target", async function () {
      const { xcmExecutor, governor, user1 } = await loadFixture(deployFixture);

      // user1 is an EOA — calling with empty calldata and zero value will succeed
      await expect(
        xcmExecutor
          .connect(governor)
          .execute([user1.address], [0n], ["0x"], ethers.ZeroHash)
      )
        .to.emit(xcmExecutor, "LocalExecuted")
        .withArgs(user1.address);
    });

    it("does NOT emit XCMDispatched for a non-parachain target", async function () {
      const { xcmExecutor, governor, user1 } = await loadFixture(deployFixture);

      const tx = await xcmExecutor
        .connect(governor)
        .execute([user1.address], [0n], ["0x"], ethers.ZeroHash);
      const receipt = await tx.wait();

      const xcmDispatchedTopic = xcmExecutor.interface.getEvent("XCMDispatched").topicHash;
      const hasXCMDispatched = receipt!.logs.some(
        (log) => log.topics[0] === xcmDispatchedTopic
      );
      expect(hasXCMDispatched).to.be.false;
    });

    it("reverts when a local call fails", async function () {
      const { xcmExecutor, governor } = await loadFixture(deployFixture);

      // Deploy a contract that always reverts to test local execution failure
      const MockOracle = await ethers.getContractFactory("MockPriceOracle");
      const badTarget = await MockOracle.deploy();
      // Call a non-existent function selector to make it revert
      const badCalldata = "0xdeadbeef"; // unknown selector → reverts
      await expect(
        xcmExecutor
          .connect(governor)
          .execute([await badTarget.getAddress()], [0n], [badCalldata], ethers.ZeroHash)
      ).to.be.revertedWithCustomError(xcmExecutor, "XCMExecutor__ExecutionFailed");
    });

    it("non-GOVERNOR_ROLE cannot call execute", async function () {
      const { xcmExecutor, user1 } = await loadFixture(deployFixture);

      await expect(
        xcmExecutor
          .connect(user1)
          .execute([user1.address], [0n], ["0x"], ethers.ZeroHash)
      ).to.be.revertedWithCustomError(xcmExecutor, "AccessControlUnauthorizedAccount");
    });

    it("reverts with LengthMismatch when arrays have different lengths", async function () {
      const { xcmExecutor, governor, user1 } = await loadFixture(deployFixture);

      await expect(
        xcmExecutor
          .connect(governor)
          .execute([user1.address, user1.address], [0n], ["0x"], ethers.ZeroHash)
      ).to.be.revertedWithCustomError(xcmExecutor, "XCMExecutor__LengthMismatch");
    });
  });

  describe("encodeXCMTransact()", function () {
    it("returns non-empty bytes for any inner call", async function () {
      const { xcmExecutor } = await loadFixture(deployFixture);

      const encoded = await xcmExecutor.encodeXCMTransact("0xdeadbeef", 1_000_000_000n);
      expect(encoded.length).to.be.gt(2); // not empty
    });

    it("begins with 0x01 (Transact instruction identifier)", async function () {
      const { xcmExecutor } = await loadFixture(deployFixture);

      const encoded = await xcmExecutor.encodeXCMTransact("0xdeadbeef", 1_000_000_000n);
      // First byte should be 0x01
      expect(encoded.slice(0, 4)).to.equal("0x01");
    });
  });
});
