/**
 * Vincent REST API Client
 *
 * Uses the shared SplitHub Smart Wallet secret-token (ssk_xxx) auth flow.
 * This client targets Vincent's current EVM wallet skill endpoints.
 */

const DEFAULT_VINCENT_API_BASE = "https://heyvincent.ai";
const BASE_SEPOLIA_CHAIN_ID = 84532;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VincentApiConfig {
  apiKey: string; // ssk_xxx secret token
}

export interface VincentAgentAccount {
  eoaAddress: string;
  smartAccountAddress: string;
}

export interface VincentApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface VincentPortfolioToken {
  network: string;
  address: string;
  tokenAddress: string;
  tokenBalance: string;
  symbol: string;
  name: string;
  decimals: number;
  logo: string | null;
  tokenPrice: string | number | null;
  value: string | number | null;
}

export interface VincentPortfolioBalances {
  address: string;
  tokens: VincentPortfolioToken[];
}

// ---------------------------------------------------------------------------
// Low-level API helpers
// ---------------------------------------------------------------------------

async function vincentRequest<T>(path: string, apiKey: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${process.env.VINCENT_API_BASE || DEFAULT_VINCENT_API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...options?.headers,
    },
  });

  const body = (await res.json().catch(() => null)) as VincentApiEnvelope<T> | null;

  // Vincent returns the useful result inside { success, data } and may still
  // use a non-2xx HTTP code for policy-denied execution results.
  if (body?.success && "data" in body) {
    return body.data;
  }

  const raw = body ? JSON.stringify(body) : await res.text().catch(() => "");
  throw new Error(`Vincent API error ${res.status} on ${path}: ${raw}`);
}

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

/** Resolve the agent (smart account) address for the shared SplitHub wallet. */
export async function getVincentAgentAccount(config: VincentApiConfig): Promise<VincentAgentAccount> {
  return vincentRequest<VincentAgentAccount>(`/api/skills/evm-wallet/address`, config.apiKey, {
    method: "GET",
  });
}

/** Return Vincent's token inventory for the shared smart wallet. */
export async function getVincentPortfolioBalances(
  config: VincentApiConfig,
  chainIds: number[] = [BASE_SEPOLIA_CHAIN_ID],
): Promise<VincentPortfolioBalances> {
  const query = chainIds.length > 0 ? `?chainIds=${chainIds.join(",")}` : "";
  return vincentRequest<VincentPortfolioBalances>(`/api/skills/evm-wallet/balances${query}`, config.apiKey, {
    method: "GET",
  });
}

/**
 * Submit a raw transaction from the Vincent smart account.
 *
 * SplitHub encodes calldata locally with viem, then Vincent signs and submits.
 */
export async function vincentSendTransaction(
  config: VincentApiConfig,
  params: {
    to: string;
    data: string;
    value?: string;
  },
): Promise<{ txHash: string; status: "executed" | "denied" | "pending_approval" }> {
  return vincentRequest(`/api/skills/evm-wallet/send-transaction`, config.apiKey, {
    method: "POST",
    body: JSON.stringify({
      chainId: BASE_SEPOLIA_CHAIN_ID,
      to: params.to,
      data: params.data,
      value: params.value ?? "0",
    }),
  });
}

export async function vincentTransferToken(
  config: VincentApiConfig,
  params: {
    to: string;
    token: string;
    amount: string;
  },
): Promise<{ txHash: string; status: "executed" | "denied" | "pending_approval" }> {
  return vincentRequest(`/api/skills/evm-wallet/transfer`, config.apiKey, {
    method: "POST",
    body: JSON.stringify({
      chainId: BASE_SEPOLIA_CHAIN_ID,
      to: params.to,
      token: params.token,
      amount: params.amount,
    }),
  });
}

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

/** Build a VincentApiConfig from environment variables. Throws if missing. */
export function getVincentConfigFromEnv(): VincentApiConfig {
  const apiKey = process.env.VINCENT_API_KEY;

  if (!apiKey) {
    throw new Error("Missing VINCENT_API_KEY environment variable");
  }

  return { apiKey };
}
