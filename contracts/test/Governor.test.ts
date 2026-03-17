import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time, mine } from "@nomicfoundation/hardhat-toolbox/network-helpers";

const STAKING_PRECOMPILE = "0x0000000000000000000000000000000000000800";
const XCM_PRECOMPILE = "0x0000000000000000000000000000000000000804";

// Voting constants matching PolyStableGovernor constructor
const VOTING_DELAY = 7200n;   // blocks
const VOTING_PERIOD = 36000n; // blocks
const TIMELOCK_DELAY = 60;    // seconds

describe("PolyStableGovernor", function () {
  async function deployFixture() {
    const [deployer, voter1, voter2] = await ethers.getSigners();

    // Mock STAKING precompile (VaultEngine deploy requires it, but we don't use VaultEngine here)
    const MockStaking = await ethers.getContractFactory("MockStaking");
    const mockStaking = await MockStaking.deploy();
    await ethers.provider.send("hardhat_setCode", [
      STAKING_PRECOMPILE,
      await ethers.provider.getCode(await mockStaking.getAddress()),
    ]);

    // Mock XCM precompile
    const MockXCM = await ethers.getContractFactory("MockXCM");
    const mockXCM = await MockXCM.deploy();
    await ethers.provider.send("hardhat_setCode", [
      XCM_PRECOMPILE,
      await ethers.provider.getCode(await mockXCM.getAddress()),
    ]);

    // Deploy PGOV (deployer receives full 100M supply)
    const PGOV = await ethers.getContractFactory("PGOV");
    const pgov = await PGOV.deploy(deployer.address);

    // Deploy XCMExecutor
    const XCMExecutor = await ethers.getContractFactory("XCMExecutor");
    const xcmExecutor = await XCMExecutor.deploy();

    // Deploy PolyStableTimelock: use deployer in proposers/executors so we can
    // manage roles after deployment (timelock is self-administered after construction).
    // We pre-compute the governor address to include it in proposers/executors.
    const deployerNonce = await ethers.provider.getTransactionCount(deployer.address);
    // timelock will be deployed at deployerNonce, governor at deployerNonce+1
    const futureGovernorAddress = ethers.getCreateAddress({
      from: deployer.address,
      nonce: deployerNonce + 1,
    });

    const PolyStableTimelock = await ethers.getContractFactory("PolyStableTimelock");
    const timelock = await PolyStableTimelock.deploy(
      TIMELOCK_DELAY,
      [futureGovernorAddress],  // proposers
      [futureGovernorAddress]   // executors
    );

    // Deploy PolyStableGovernor (must match the pre-computed address)
    const Governor = await ethers.getContractFactory("PolyStableGovernor");
    const governor = await Governor.deploy(
      await pgov.getAddress(),
      await timelock.getAddress(),
      await xcmExecutor.getAddress()
    );

    // Sanity-check address prediction
    expect(await governor.getAddress()).to.equal(futureGovernorAddress);

    // Grant XCMExecutor GOVERNOR_ROLE to the governor so it can call execute()
    const GOVERNOR_ROLE = await xcmExecutor.GOVERNOR_ROLE();
    await xcmExecutor.grantRole(GOVERNOR_ROLE, await governor.getAddress());

    // Deploy PUSD as a simple governance target
    const PUSD = await ethers.getContractFactory("PUSD");
    const pusd = await PUSD.deploy();
    // Grant timelock DEFAULT_ADMIN_ROLE on PUSD so proposals can manage it
    const DEFAULT_ADMIN_ROLE = await pusd.DEFAULT_ADMIN_ROLE();
    await pusd.grantRole(DEFAULT_ADMIN_ROLE, await timelock.getAddress());

    // Delegate pGOV voting power to deployer so they can propose and vote
    await pgov.delegate(deployer.address);
    // Mine one block so snapshot reflects the delegation
    await mine(1);

    return {
      deployer,
      voter1,
      voter2,
      pgov,
      timelock,
      governor,
      xcmExecutor,
      pusd,
    };
  }

  // ─── Helper: create a proposal to grantRole on PUSD ────────────────────────
  async function createTestProposal(
    governor: Awaited<ReturnType<typeof deployFixture>>["governor"],
    pusd: Awaited<ReturnType<typeof deployFixture>>["pusd"],
    recipient: string
  ) {
    const MINTER_ROLE = await pusd.MINTER_ROLE();
    const calldata = pusd.interface.encodeFunctionData("grantRole", [MINTER_ROLE, recipient]);
    const targets = [await pusd.getAddress()];
    const values = [0n];
    const calldatas = [calldata];
    const description = "Proposal: grant MINTER_ROLE";
    const descriptionHash = ethers.id(description);

    const proposalId = await governor.hashProposal(targets, values, calldatas, descriptionHash);
    await governor.propose(targets, values, calldatas, description);

    return { targets, values, calldatas, description, descriptionHash, proposalId };
  }

  describe("proposal threshold", function () {
    it("returns max(0.1% of total supply, 10_000e18)", async function () {
      const { governor, pgov } = await loadFixture(deployFixture);

      const supply = await pgov.totalSupply(); // 100M pGOV
      const oneTenth = supply / 1000n;         // 0.1% = 100_000e18
      const minimum = ethers.parseEther("10000");

      const expected = oneTenth > minimum ? oneTenth : minimum;
      expect(await governor.proposalThreshold()).to.equal(expected);
    });

    it("deployer (100M pGOV delegated) meets the proposal threshold", async function () {
      const { governor, deployer } = await loadFixture(deployFixture);
      const threshold = await governor.proposalThreshold();
      const votes = await governor.getVotes(deployer.address, (await ethers.provider.getBlockNumber()) - 1);
      expect(votes).to.be.gte(threshold);
    });
  });

  describe("voting", function () {
    it("allows voting with pGOV balance after voting delay", async function () {
      const { governor, deployer, pusd, voter1 } = await loadFixture(deployFixture);

      const { proposalId } = await createTestProposal(governor, pusd, voter1.address);

      // Advance past the voting delay
      await mine(Number(VOTING_DELAY) + 1);

      // deployer votes For (type 1)
      await governor.connect(deployer).castVote(proposalId, 1);

      // Proposal should have received votes
      const { forVotes } = await governor.proposalVotes(proposalId);
      expect(forVotes).to.be.gt(0);
    });

    it("rejects vote before voting delay has elapsed", async function () {
      const { governor, deployer, pusd, voter1 } = await loadFixture(deployFixture);

      const { proposalId } = await createTestProposal(governor, pusd, voter1.address);
      // Do NOT mine past the delay — proposal is still in Pending state

      await expect(
        governor.connect(deployer).castVote(proposalId, 1)
      ).to.be.revertedWithCustomError(governor, "GovernorUnexpectedProposalState");
    });
  });

  describe("full proposal lifecycle (local execution)", function () {
    it("executes locally for non-parachain targets", async function () {
      const { governor, deployer, pusd, voter1 } = await loadFixture(deployFixture);

      const { targets, values, calldatas, descriptionHash, proposalId } =
        await createTestProposal(governor, pusd, voter1.address);

      // 1. Pass voting delay
      await mine(Number(VOTING_DELAY) + 1);

      // 2. Vote For
      await governor.connect(deployer).castVote(proposalId, 1);

      // 3. Pass voting period
      await mine(Number(VOTING_PERIOD) + 1);

      // Proposal should be Succeeded (state 4)
      expect(await governor.state(proposalId)).to.equal(4);

      // 4. Queue in timelock
      await governor.queue(targets, values, calldatas, descriptionHash);

      // Proposal should be Queued (state 5)
      expect(await governor.state(proposalId)).to.equal(5);

      // 5. Wait for timelock delay
      await time.increase(TIMELOCK_DELAY + 1);

      // 6. Execute
      await governor.execute(targets, values, calldatas, descriptionHash);

      // Verify the proposal action was executed: voter1 should have MINTER_ROLE on PUSD
      expect(await pusd.hasRole(await pusd.MINTER_ROLE(), voter1.address)).to.be.true;
    });
  });

  describe("timelock enforcement", function () {
    it("reverts execution before timelock delay has passed", async function () {
      const { governor, timelock, deployer, pusd, voter1 } = await loadFixture(deployFixture);

      const { targets, values, calldatas, descriptionHash, proposalId } =
        await createTestProposal(governor, pusd, voter1.address);

      await mine(Number(VOTING_DELAY) + 1);
      await governor.connect(deployer).castVote(proposalId, 1);
      await mine(Number(VOTING_PERIOD) + 1);

      await governor.queue(targets, values, calldatas, descriptionHash);

      // Do NOT advance time past the timelock delay — attempt to execute immediately.
      // The revert originates in the TimelockController (timelock), not the governor.
      await expect(
        governor.execute(targets, values, calldatas, descriptionHash)
      ).to.be.revertedWithCustomError(timelock, "TimelockUnexpectedOperationState");
    });

    it("proposal state is Queued immediately after queue()", async function () {
      const { governor, deployer, pusd, voter1 } = await loadFixture(deployFixture);

      const { targets, values, calldatas, descriptionHash, proposalId } =
        await createTestProposal(governor, pusd, voter1.address);

      await mine(Number(VOTING_DELAY) + 1);
      await governor.connect(deployer).castVote(proposalId, 1);
      await mine(Number(VOTING_PERIOD) + 1);

      await governor.queue(targets, values, calldatas, descriptionHash);

      // State 5 = Queued
      expect(await governor.state(proposalId)).to.equal(5);
    });
  });
});
