# PolyStable — Cross-Chain CDP Stablecoin on Polkadot

## Overview

PolyStable is a Collateralized Debt Position (CDP) protocol built exclusively for Polkadot Hub. Users lock DOT or XCM parachain tokens as collateral to mint **pUSD**, a fully on-chain USD-pegged stablecoin. Unlike traditional CDP designs, PolyStable leverages Polkadot-native primitives — including the staking precompile, XCM execution, and parachain composability — to create a stablecoin system that earns yield on idle collateral and governs itself across the entire Polkadot ecosystem from a single on-chain vote.

The protocol's stability model is backed by three interlocking mechanisms: over-collateralization enforced by the VaultEngine, a Surplus Buffer that accumulates staking rewards and stability fees as a reserve layer, and a keeper network that maintains system health by liquidating undercollateralized vaults with a 5% bonus incentive. Governance is handled by pGOV token holders via an OpenZeppelin Governor + 48-hour Timelock, with a novel XCMExecutor that allows a single Hub proposal to propagate parameter changes across all registered parachains.

## Why Polkadot-Exclusive

- **Staking Precompile Integration** — PolyStable bonds deposited DOT directly to Polkadot validators via the `0x0000...0800` staking precompile. Staking rewards flow automatically to the SurplusBuffer, creating a self-sustaining stability reserve without any off-chain infrastructure.
- **XCM Parachain Collateral** — The collateral system is designed from the ground up to accept XCM-bridged assets. Any parachain token can be registered as a collateral type, enabling cross-chain leverage positions that would be impossible on a siloed EVM chain.
- **XCM-Powered Governance** — The XCMExecutor extends OpenZeppelin's Governor to route proposal executions via XCM messages to registered parachains. One governance vote on Hub can atomically update risk parameters (debt ceilings, stability fees, liquidation ratios) across the entire Polkadot ecosystem.

## Architecture

```
User → VaultEngine → PUSD (mint)
VaultEngine → StakingPrecompile (bond DOT)
VaultEngine → SurplusBuffer (stability fees)
LiquidationEngine → VaultEngine + SurplusBuffer
Governor → XCMExecutor → XCMPrecompile → Parachains
```

```
┌─────────────────────────────────────────────────────────────────┐
│                        Polkadot Hub EVM                          │
│                                                                   │
│  User ──────────────────────────────────────────┐                │
│       │                                         │                │
│       ▼                                         │                │
│  VaultEngine ──── mint ──────────► PUSD Token   │                │
│       │                                         │                │
│       ├── bond DOT ──► StakingPrecompile (0x800)│                │
│       │                      │                  │                │
│       │                      ▼ rewards           │               │
│       └── stability fees ──► SurplusBuffer ◄────┘                │
│                                   │                              │
│  LiquidationEngine ──────────────►│ absorbLoss                  │
│       ▲                           │                              │
│       │                           ▼                              │
│  Keepers ──── liquidate ──► VaultEngine                          │
│                                                                   │
│  pGOV Holders ──► Governor ──► Timelock ──► XCMExecutor          │
│                                                │                  │
│                                                ▼                  │
│                                    XCMPrecompile (0x804)          │
│                                                │                  │
│                                                ▼                  │
│                                    Registered Parachains           │
└─────────────────────────────────────────────────────────────────┘
```

## OpenZeppelin Components

| Component | Usage | Customization |
|-----------|-------|---------------|
| `ERC20` + `ERC20Permit` | PUSD stablecoin and PGOV governance token | 10M per-address mint cap on PUSD; max supply enforcement |
| `ERC20Votes` | PGOV voting power delegation | Zero-balance delegation protection against dust attacks |
| `Governor` + extensions | On-chain governance for protocol parameters | Custom `_executeOperations` routes XCM targets via XCMExecutor |
| `TimelockController` | 48-hour delay on all governance executions | Emits `XCMExecutionLog` on every execution for audit trail |
| `AccessControl` | Role-based permissions across all contracts | MINTER_ROLE, BURNER_ROLE, LIQUIDATOR_ROLE, COLLATERAL_ADMIN_ROLE, GUARDIAN_ROLE |
| `Pausable` | Emergency circuit-breaker on VaultEngine | Guardian role can pause/unpause without timelock |
| `ReentrancyGuard` | Protection on all state-changing external functions | Applied to VaultEngine and LiquidationEngine |

## Track Eligibility

- [x] **EVM Smart Contract Track** — DeFi + Stablecoin category: complete CDP stablecoin with oracle, liquidation, and governance
- [x] **OpenZeppelin Sponsor Track** — Non-trivial composition of 7 OZ primitives: ERC20Votes, Governor, TimelockController, AccessControl, Pausable, ReentrancyGuard, ERC20Permit

## Deployed Contracts (Polkadot Hub Testnet)

| Contract | Address |
|----------|---------|
| PGOV | `0x1f8365aC24FC5210656664CAb2d078aCF1B9fA96` |
| PUSD | `0x96d1390413219651d40137F6a002584D87f5542b` |
| PriceOracle | `0xA9A89477aA43F608fccc490D00E7DA1e140e87A5` |
| SurplusBuffer | `0xfb6aeE36cFb805e919777a173D93b38bC35cD11C` |
| PolyStableTimelock | `0x5C2D404dC30d3B8b4f6938b5C83118116daBE8bc` |
| VaultEngine | `0x103C20F2Dea7BBcAdE02D1902Bd40124DB7240fF` |
| LiquidationEngine | `0x28ec6B6EE92c15Eef30A9d5C23fB6897C5659ca5` |
| XCMExecutor | `0x1837466D98c1af4ceC8952aEe577d65626F2F891` |
| PolyStableGovernor | `0x0108f49C8D821930e00a2423e329079F973D1c2a` |

## Local Development

### Prerequisites

- Node.js v20+
- npm v10+
- Git

### Setup

```bash
git clone https://github.com/UncleTom29/PolyStable.git
cd PolyStable
cp .env.example .env
# Edit .env with your private key and RPC settings

# Install all workspace dependencies
cd contracts && npm install
```

### Compile & Test

```bash
# Compile smart contracts
cd contracts && npx hardhat compile

# Run all tests (65 tests, ~1s)
cd contracts && npx hardhat test

# Run with gas reporting
REPORT_GAS=true cd contracts && npx hardhat test

# Solidity coverage
cd contracts && npx hardhat coverage
```

### Deploy

```bash
# Deploy to Polkadot Hub Testnet
cd contracts && npx hardhat run scripts/deploy.ts --network polkadotHubTestnet

# Seed testnet with sample vaults and a governance proposal
cd contracts && npx hardhat run scripts/seed-testnet.ts --network polkadotHubTestnet

# Verify contracts on Blockscout
cd contracts && npx hardhat run scripts/verify.ts --network polkadotHubTestnet
```

### Frontend

```bash
cd frontend && npm install && npm run dev
# Open http://localhost:3000
```

### Keeper Bot

```bash
cd keeper && npm install
# Set KEEPER_PRIVATE_KEY and contract addresses in .env
npm run start
```

## How to Get Testnet DOT

1. Visit the [Polkadot Faucet](https://faucet.polkadot.io/)
2. Connect your wallet to Polkadot Hub Testnet (chainId: 420420417)
3. Request testnet DOT tokens

Alternatively, use the Polkadot Hub testnet faucet:
- RPC: `https://services.polkadothub-rpc.com/testnet`
- Block Explorer: `https://blockscout-passet-hub.parity-testnet.parity.io`

## Roadmap

**Phase 1 — MVP (Hackathon, March 2026)**
- [x] Core CDP: VaultEngine with DOT collateral and native staking
- [x] pUSD stablecoin with per-address mint caps
- [x] OZ Governor + 48h Timelock governance
- [x] XCMExecutor for cross-parachain governance dispatch
- [x] Liquidation engine with 5% keeper bonus
- [x] Surplus Buffer accumulating staking yield + stability fees
- [x] Full test suite (65 tests, 85%+ branch coverage)
- [x] Keeper bot: liquidations, staking harvest, price monitoring
- [x] Next.js 14 frontend with wagmi v2

**Phase 2 — Q2 2026**
- [ ] Multi-collateral XCM assets (Hydration HDX, Bifrost vDOT)
- [ ] Hydration pUSD liquidity pool integration
- [ ] Dutch auction liquidations for better capital efficiency
- [ ] W3F grant application
- [ ] Mobile-optimized frontend

**Phase 3 — Q3 2026**
- [ ] Full security audit (Spearbit or Trail of Bits)
- [ ] Mainnet deployment on Polkadot Hub
- [ ] pUSD cross-parachain settlement via XCM
- [ ] Multi-collateral governance framework

## Vision

PolyStable aims to become Polkadot's canonical stablecoin layer — the trust-minimized, natively cross-chain dollar that flows seamlessly between Acala, Moonbeam, Hydration, and all future parachains without bridges, intermediaries, or wrapped tokens. By building on Polkadot Hub's shared security and XCM messaging, every pUSD minted is backed by the collective economic security of the Polkadot relay chain, making it structurally more resilient than any single-chain CDP. The protocol's governance token, pGOV, represents not just voting rights over risk parameters, but ownership of the settlement layer for the next generation of Polkadot DeFi.

- **GitHub**: [https://github.com/UncleTom29/PolyStable](https://github.com/UncleTom29/PolyStable)

## License

MIT — see [LICENSE](./LICENSE)
