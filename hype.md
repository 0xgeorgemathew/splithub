# HyperEVM Testnet: Complete Developer Guide

Hyperliquid's HyperEVM is not a separate blockchain—it's an Ethereum-compatible execution environment embedded directly into the Hyperliquid L1, secured by the same HyperBFT consensus. This architecture enables smart contracts to **read HyperCore state** (positions, balances, oracle prices) and **write trading actions** directly to the native order books, creating unprecedented composability between DeFi smart contracts and high-performance perpetual trading.

## HyperEVM architecture and L1 integration

HyperEVM operates as an extension of Hyperliquid's two-component blockchain architecture. **HyperCore** handles all trading activities—perpetual futures, spot markets, staking, and liquidations—while **HyperEVM** provides the smart contract layer. Both share identical consensus and finality, meaning EVM transactions receive the same **sub-second finality** (~0.2s median latency) as native trading operations.

The technical foundation is the **Cancun EVM specification** (without blob transactions) running on **Chain ID 998** for testnet (999 for mainnet). Unlike traditional EVM chains, both base fees and priority fees are burned due to HyperBFT consensus. HYPE serves as the native gas token with **18 decimals**.

### How HyperEVM connects to HyperCore

The connection happens through two key mechanisms that enable bidirectional communication:

**Read Precompiles** (addresses starting at `0x0000000000000000000000000000000000000800`) allow smart contracts to query HyperCore data directly:
- `0x...0800`: User perp positions (size, leverage, entry price)
- `0x...0801`: Spot balances
- `0x...0806`: Mark prices for perps
- `0x...0807`: Oracle prices for perps

**CoreWriter System Contract** at `0x3333333333333333333333333333333333333333` enables smart contracts to submit orders, transfer between spot/perp accounts, and execute other HyperCore actions. Order actions are intentionally delayed **2-3 seconds** on-chain to prevent latency arbitrage.

The relationship to perp trading is direct: lending protocols can read prices from HyperCore order books and execute liquidations via CoreWriter in just a few lines of Solidity. A smart contract can query a user's position, check collateral ratios against real-time prices, and submit liquidation orders—all without external oracles or bridges.

## Testnet wallet configuration

Add HyperEVM testnet to MetaMask with these exact parameters:

| Parameter | Value |
|-----------|-------|
| **Network Name** | Hyperliquid EVM Testnet |
| **RPC URL** | `https://rpc.hyperliquid-testnet.xyz/evm` |
| **Chain ID** | 998 |
| **Currency Symbol** | HYPE |
| **Block Explorer** | `https://testnet.purrsec.com/` |

Alternative RPC endpoints include `https://hyperliquid-testnet.drpc.org` and Alchemy's `https://hyperliquid-testnet.g.alchemy.com/<api-key>`.

### Asset transfers between HyperCore and HyperEVM

HYPE moves between environments via the system address `0x2222222222222222222222222222222222222222`. Send HYPE to this address from either your HyperCore spot balance or HyperEVM wallet—tokens arrive at the same address on the opposite side. **Only HYPE works with this address**; sending other tokens results in permanent loss.

For other tokens, each spot asset has a unique bridge address following the pattern `0x2000...` + token index in big-endian hex.

## Testnet token acquisition

Two tokens are required: **USDC** for perp margin and **HYPE** for gas.

### Getting testnet USDC
The official faucet at `https://app.hyperliquid-testnet.xyz/drip` provides **1,000 mock USDC** every 4 hours. One prerequisite: your wallet must have deposited on mainnet first (even a tiny amount) to activate the address.

### Getting testnet HYPE

| Faucet | Amount | Rate Limit | Requirements |
|--------|--------|------------|--------------|
| Chainstack (`chainstack.com/faucet`) | 1 HYPE | 24 hours | API key + 0.08 ETH mainnet |
| QuickNode (`faucet.quicknode.com/hyperliquid/testnet`) | 1 HYPE | 12 hours | 0.05 HYPE mainnet + Tweet |
| Gas.zip (`gas.zip/faucet/hyperevm`) | 0.0025 HYPE | 12 hours | Eligibility check |

Alternative: Claim USDC from the drip faucet, swap for HYPE on the testnet spot market, then transfer HYPE to HyperEVM using the in-app "Transfer to/from EVM" button.

## Viewing position details

### API method
Query the info endpoint at `https://api.hyperliquid-testnet.xyz/info`:

```json
POST /info
{
  "type": "clearinghouseState",
  "user": "0xYourAddress"
}
```

The response includes `assetPositions` array with each position's coin, signed size (`szi`), entry price, leverage, unrealized PnL, and liquidation price.

### SDK methods
Both TypeScript SDKs provide position queries:

```typescript
// Using 'hyperliquid' package (nomeida)
const state = await sdk.info.perpetuals.getClearinghouseState('0x...');
const positions = state.assetPositions;

// Using '@nktkas/hyperliquid' package
const state = await infoClient.clearinghouseState({ user: '0x...' });
```

### Explorer tools
- **Purrsec Testnet**: `https://testnet.purrsec.com/` for HyperEVM transactions
- **Testnet App**: `https://app.hyperliquid-testnet.xyz/portfolio` shows positions directly

## Technical details for script development

### SDK installation and testnet configuration

The `hyperliquid` npm package (by nomeida) provides the most straightforward integration:

```typescript
import { Hyperliquid } from 'hyperliquid';

const sdk = new Hyperliquid({
  privateKey: process.env.PRIVATE_KEY,
  testnet: true,  // Critical: enables testnet endpoints
  enableWs: false // Disable if not using subscriptions
});

// Optional: wait for asset maps to initialize
await sdk.connect();
```

For the `@nktkas/hyperliquid` package:

```typescript
import * as hl from '@nktkas/hyperliquid';

const transport = new hl.HttpTransport({ isTestnet: true });
const infoClient = new hl.InfoClient({ transport });
const exchClient = new hl.ExchangeClient({ 
  wallet: process.env.PRIVATE_KEY,
  transport 
});
```

### API endpoints for testnet

| Endpoint | URL |
|----------|-----|
| Info API | `https://api.hyperliquid-testnet.xyz/info` |
| Exchange API | `https://api.hyperliquid-testnet.xyz/exchange` |
| WebSocket | `wss://api.hyperliquid-testnet.xyz/ws` |
| EVM RPC | `https://rpc.hyperliquid-testnet.xyz/evm` |

### Order parameters for perpetuals

Asset identification uses integer indices from the `meta` response. **BTC is typically index 0**, ETH is 1. The SDK abstracts this with strings like `'BTC-PERP'`.

```typescript
// Required order parameters
{
  coin: 'BTC-PERP',        // Market identifier
  is_buy: true,            // Direction: true=long, false=short
  sz: 0.01,                // Size in base asset
  limit_px: 95000,         // Limit price
  order_type: {
    limit: { tif: 'Gtc' }  // Gtc, Ioc, or Alo (post-only)
  },
  reduce_only: false       // Whether order only reduces position
}
```

For leverage, call `updateLeverage` before or after opening positions:

```typescript
await sdk.exchange.updateLeverage({
  coin: 'BTC-PERP',
  leverageMode: 'cross',  // 'cross' or 'isolated'
  leverage: 10
});
```

### Adding margin to positions

For isolated margin positions, use `updateIsolatedMargin`:

```typescript
// Raw API action structure
{
  "type": "updateIsolatedMargin",
  "asset": 0,          // Asset index (0 = BTC)
  "isBuy": true,       // Position direction
  "ntli": 1000000      // Amount in 6 decimals (1000000 = 1 USDC)
}

// Alternative: target specific leverage
{
  "type": "topUpIsolatedOnlyMargin",
  "asset": 0,
  "leverage": "5.0"    // Target leverage as float string
}
```

The SDKs don't always expose this directly—you may need to construct the raw action and post to the exchange endpoint.

### EIP-712 signing structure

Hyperliquid uses two signing patterns. **L1 actions** (orders, leverage updates) use a phantom agent mechanism:

```typescript
const domain = {
  name: "Exchange",
  version: "1",
  chainId: 1337,  // Fixed phantom chain ID
  verifyingContract: "0x0000000000000000000000000000000000000000"
};

const types = {
  Agent: [
    { name: "source", type: "string" },
    { name: "connectionId", type: "bytes32" }
  ]
};

// message.source = "b" for testnet, "a" for mainnet
```

**User-signed actions** (transfers, withdrawals) use:

```typescript
const domain = {
  name: "HyperliquidSignTransaction",
  version: "1",
  chainId: 421614,  // Arbitrum Sepolia for testnet
  verifyingContract: "0x0000000000000000000000000000000000000000"
};

// message.hyperliquidChain = "Testnet"
```

The SDKs handle all signing internally—you simply provide a private key or ethers/viem wallet.

### Rate limits and restrictions

**IP-based limits**:
- REST: **1,200 weight per minute** (most requests = 2 weight, some = 20)
- EVM RPC: **100 requests/minute** for public endpoint
- WebSocket: Max 1,000 subscriptions per IP

**Address-based limits**:
- Initial buffer of 10,000 requests
- Replenished at 1 request per $1 USDC traded
- When rate limited: 1 request per 10 seconds

**Minimum requirements**:
- $10 minimum notional per order
- Account must have deposited **at least 5 USDC** before API access works

### Nonce handling

Use current timestamp in milliseconds. The system stores the 100 highest nonces per signing key and accepts nonces within (T - 2 days, T + 1 day) of block timestamp.

```typescript
const nonce = Date.now();
```

## Example TypeScript scripts

### Script 1: Open a perpetual position

```typescript
// openPosition.ts
import { Hyperliquid } from 'hyperliquid';
import * as dotenv from 'dotenv';
dotenv.config();

async function openPosition() {
  const sdk = new Hyperliquid({
    privateKey: process.env.PRIVATE_KEY!,
    testnet: true,
    enableWs: false
  });

  // Set leverage first (optional, defaults to 1x cross)
  await sdk.exchange.updateLeverage({
    coin: 'BTC-PERP',
    leverageMode: 'cross',
    leverage: 5
  });

  // Get current mid price for reference
  const mids = await sdk.info.getAllMids();
  const btcMid = parseFloat(mids['BTC']);
  
  // Place a limit order slightly below market for a long
  const result = await sdk.exchange.placeOrder({
    coin: 'BTC-PERP',
    is_buy: true,
    sz: 0.001,                    // Minimum size ~$95 at $95k
    limit_px: Math.floor(btcMid * 0.999),  // 0.1% below mid
    order_type: { limit: { tif: 'Gtc' } },
    reduce_only: false
  });

  console.log('Order result:', JSON.stringify(result, null, 2));
  
  // Check position
  const state = await sdk.info.perpetuals.getClearinghouseState(
    sdk.walletAddress
  );
  console.log('Positions:', state.assetPositions);
}

openPosition().catch(console.error);
```

### Script 2: Add margin to position

```typescript
// addMargin.ts
import * as dotenv from 'dotenv';
dotenv.config();

const TESTNET_EXCHANGE_URL = 'https://api.hyperliquid-testnet.xyz/exchange';

async function addMarginToPosition() {
  const { ethers } = await import('ethers');
  
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!);
  const address = wallet.address;

  // EIP-712 domain for L1 actions
  const domain = {
    name: 'Exchange',
    version: '1',
    chainId: 1337,
    verifyingContract: '0x0000000000000000000000000000000000000000'
  };

  const types = {
    Agent: [
      { name: 'source', type: 'string' },
      { name: 'connectionId', type: 'bytes32' }
    ]
  };

  // Action to add margin
  const action = {
    type: 'updateIsolatedMargin',
    asset: 0,           // BTC index
    isBuy: true,        // Long position
    ntli: 10000000      // 10 USDC (6 decimals)
  };

  const nonce = Date.now();
  
  // Hash the action for signing
  const actionHash = ethers.keccak256(
    ethers.toUtf8Bytes(JSON.stringify(action) + nonce)
  );

  const message = {
    source: 'b',  // 'b' for testnet, 'a' for mainnet
    connectionId: actionHash
  };

  const signature = await wallet.signTypedData(domain, types, message);
  const { r, s, v } = ethers.Signature.from(signature);

  const payload = {
    action,
    nonce,
    signature: { r, s, v }
  };

  const response = await fetch(TESTNET_EXCHANGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  console.log('Add margin result:', JSON.stringify(result, null, 2));
}

addMarginToPosition().catch(console.error);
```

**Note**: The `hyperliquid` SDK may not expose `updateIsolatedMargin` directly. The second script shows raw API interaction. For production use, consider wrapping the signing logic or using the `@nktkas/hyperliquid` SDK's `exchClient.updateIsolatedMargin()` method.

## Additional technical considerations

**Testnet quirks**: Testnet data may have lower liquidity and wider spreads than mainnet. The drip faucet requirement for mainnet activity catches some developers off-guard—fund your mainnet wallet first.

**No official @hyperliquid/sdk**: Despite the task mentioning `@hyperliquid/sdk`, Hyperliquid maintains only a Python SDK officially. The TypeScript SDKs (`hyperliquid` by nomeida, `@nktkas/hyperliquid`) are community-maintained but well-documented and actively updated.

**Authentication**: No API keys required—authentication is entirely through EIP-712 signatures from your wallet. This means your private key must be available to sign every exchange action.

**Contract addresses**: There are no separate perp trading contracts on HyperEVM. Perp trading happens on HyperCore through the API. HyperEVM contracts interact with HyperCore via the CoreWriter system contract at `0x3333333333333333333333333333333333333333`.

**Error patterns**: Common errors include `"User does not exist"` (need to deposit 5+ USDC first), signature mismatches (check testnet vs mainnet domain), and rate limit exceeded (implement exponential backoff).

## Conclusion

HyperEVM testnet provides a complete environment for developing perpetual trading applications. The dual architecture—HyperCore for native trading, HyperEVM for programmable DeFi—enables novel applications like automated liquidators, delta-hedging vaults, and composable margin protocols. Start with the drip faucet at `app.hyperliquid-testnet.xyz/drip`, configure the TypeScript SDK with `testnet: true`, and leverage the `clearinghouseState` endpoint to monitor positions throughout development.