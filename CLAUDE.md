# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SplitHub is a tap-based payment splitting application built on Scaffold-ETH 2. Users tap NFC chips to authorize payments, enabling seamless bill splitting without wallet popups or manual transaction signing.

## Commands

```bash
# Development
yarn chain              # Start local Anvil chain
yarn deploy             # Deploy contracts to local chain
yarn start              # Start Next.js dev server (localhost:3000)

# Smart Contracts
yarn foundry:test       # Run Forge tests
yarn compile            # Compile contracts
yarn deploy:verify      # Deploy and verify on Etherscan

# Network shortcuts
yarn deploy:local       # Deploy to localhost
yarn deploy:base        # Deploy to Base Sepolia
yarn test:registry      # Test SplitHubRegistry
yarn test:credit        # Test CreditToken
yarn register:local     # Register chip on localhost
yarn register:base      # Register chip on Base Sepolia

# Code Quality
yarn lint               # Lint both frontend and contracts
yarn format             # Format all code
yarn next:check-types   # TypeScript type checking
```

## Architecture

**Monorepo Structure** (Yarn Workspaces):
- `packages/foundry/` - Solidity contracts with Foundry
- `packages/nextjs/` - Next.js 15 frontend with App Router

### Smart Contracts

```
packages/foundry/contracts/
  SplitHubRegistry.sol    # Chip address → owner address mapping
  SplitHubPayments.sol    # EIP-712 signature verification + gasless payments
  CreditToken.sol         # ERC20 credits: purchase with USDC, spend at activities
```

**SplitHubRegistry** - Core registration contract linking NFC chip addresses to owner wallets. Uses EIP-712 signatures for gasless registration.

**SplitHubPayments** - Executes gasless ERC-20 transfers using chip-signed authorizations. Verifies chip ownership via Registry.

**CreditToken** - ERC20 for Activity Zone credits. 1 USDC = 10 credits (handles 6→18 decimal conversion). Supports gasless purchase and spend via EIP-712 signatures.

EIP-712 types:
```solidity
// SplitHubPayments
struct PaymentAuth {
    address payer; address recipient; address token;
    uint256 amount; uint256 nonce; uint256 deadline;
}

// CreditToken
struct CreditPurchase { address buyer; uint256 usdcAmount; uint256 nonce; uint256 deadline; }
struct CreditSpend { address spender; uint256 amount; address activityId; uint256 nonce; uint256 deadline; }
```

**Deployment**: Scripts in `packages/foundry/script/` use `ScaffoldETHDeploy` base class. Deployments auto-export to `deployments/{chainId}.json` and generate TypeScript ABIs.

### Frontend

- **Scaffold-ETH hooks** (`packages/nextjs/hooks/scaffold-eth/`): Type-safe wrappers around wagmi for contract interaction
  - `useScaffoldReadContract` / `useScaffoldWriteContract` for contract calls
  - `useDeployedContractInfo` for contract metadata
- **Contract ABIs** auto-generated at `packages/nextjs/contracts/deployedContracts.ts`
- **Config**: `packages/nextjs/scaffold.config.ts` for target networks and settings

### Pages

| Route | Purpose |
|-------|---------|
| `/` | Home dashboard with chip registration status |
| `/register` | Onboarding: wallet + profile → NFC chip registration |
| `/settle` | Single tap-to-pay payment flow |
| `/multi-settle` | Batch payments with multiple payers |
| `/settle/[requestId]` | Payment request links |
| `/approve` | Token approvals for Payments or Credits contracts |
| `/credits` | POS terminal for purchasing credits with USDC |

### Payment Flow

1. Initiator configures split (total, participants, token)
2. Initiator taps NFC chip → identified as recipient
3. Each participant taps → chip signs PaymentAuth → relay executes transfer
4. Frontend tracks progress until all shares collected

## Key Design Decisions

- **Frontend-calculated splits**: No on-chain split logic (reduces gas)
- **Gasless via relay**: Relayer submits transactions; users never pay gas
- **Simplified nonces**: `uint256` auto-increment per payer
- **NFC signing**: Uses `@arx-research/libhalo` for chip interaction

## Adding a New Contract

When adding a new contract, create these yarn shortcuts in both `packages/foundry/package.json` and root `package.json`:

1. **Deploy script** (`packages/foundry/script/Deploy{ContractName}.s.sol`):
   - Must push to `deployments` array for JSON export
   ```solidity
   ContractName c = new ContractName();
   deployments.push(Deployment({ name: "ContractName", addr: address(c) }));
   ```

2. **Test file** (`packages/foundry/test/{ContractName}.t.sol`)

3. **Yarn shortcuts** (add to both package.json files):
   ```json
   "test:{name}": "forge test --match-contract {ContractName}Test -vvv"
   "deploy:{name}:local": "node scripts-js/parseArgs.js --file Deploy{ContractName}.s.sol --network localhost"
   "deploy:{name}:base": "node scripts-js/parseArgs.js --file Deploy{ContractName}.s.sol --network baseSepolia"
   ```

4. **Script shortcuts** (if contract has associated scripts like RegisterChip):
   ```json
   "{action}:local": "node scripts-js/parseArgs.js --file {Script}.s.sol --network localhost"
   "{action}:base": "node scripts-js/parseArgs.js --file {Script}.s.sol --network baseSepolia"
   ```

## Formatting

- Solidity: 120 char lines, 4-space tabs, double quotes (see `foundry.toml`)
- TypeScript: Prettier config in `packages/nextjs/.prettierrc.js`
- Path alias: `~~/*` resolves to `packages/nextjs/`
