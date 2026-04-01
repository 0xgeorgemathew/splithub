import { createPublicClient, createWalletClient, decodeEventLog, http, keccak256, toBytes, zeroHash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, sepolia } from "viem/chains";

export const ERC8004_OPERATING_CHAIN_ID = baseSepolia.id;
export const ERC8004_TRUST_CHAIN_ID = sepolia.id;
export const ERC8004_DEFAULT_IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e" as const;
export const ERC8004_DEFAULT_REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713" as const;
export const ERC8004_DEFAULT_VALIDATION_REGISTRY = "0x8004Cb1BF31DAf7788923b405b754f57acEB4272" as const;
export const ERC8004_SPEC_URL = "https://eips.ethereum.org/EIPS/eip-8004";

export const ERC8004_IDENTITY_REGISTRY_ABI = [
  {
    type: "function",
    name: "register",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "agentId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setAgentWallet",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "newWallet", type: "address" },
      { name: "deadline", type: "uint256" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getAgentWallet",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "Registered",
    inputs: [
      { indexed: true, name: "agentId", type: "uint256" },
      { indexed: false, name: "agentURI", type: "string" },
      { indexed: true, name: "owner", type: "address" },
    ],
    anonymous: false,
  },
] as const;

export const ERC8004_VALIDATION_REGISTRY_ABI = [
  {
    type: "function",
    name: "validationRequest",
    inputs: [
      { name: "validatorAddress", type: "address" },
      { name: "agentId", type: "uint256" },
      { name: "requestURI", type: "string" },
      { name: "requestHash", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "validationResponse",
    inputs: [
      { name: "requestHash", type: "bytes32" },
      { name: "response", type: "uint8" },
      { name: "responseURI", type: "string" },
      { name: "responseHash", type: "bytes32" },
      { name: "tag", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const ERC8004_REPUTATION_REGISTRY_ABI = [
  {
    type: "function",
    name: "giveFeedback",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "value", type: "int128" },
      { name: "valueDecimals", type: "uint8" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
      { name: "endpoint", type: "string" },
      { name: "feedbackURI", type: "string" },
      { name: "feedbackHash", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export type Erc8004TrustConfig = {
  chainId: number;
  rpcUrl: string;
  explorerBaseUrl: string;
  identityRegistryAddress: `0x${string}`;
  reputationRegistryAddress: `0x${string}`;
  validationRegistryAddress: `0x${string}`;
};

export function getErc8004TrustConfig(): Erc8004TrustConfig {
  return {
    chainId: ERC8004_TRUST_CHAIN_ID,
    rpcUrl:
      process.env.ERC8004_TRUST_RPC_URL ||
      process.env.NEXT_PUBLIC_ERC8004_TRUST_RPC_URL ||
      sepolia.rpcUrls.default.http[0] ||
      "https://ethereum-sepolia-rpc.publicnode.com",
    explorerBaseUrl:
      process.env.ERC8004_TRUST_EXPLORER_BASE_URL ||
      process.env.NEXT_PUBLIC_ERC8004_TRUST_EXPLORER_BASE_URL ||
      "https://sepolia.etherscan.io",
    identityRegistryAddress: (process.env.ERC8004_IDENTITY_REGISTRY_ADDRESS ||
      process.env.NEXT_PUBLIC_ERC8004_IDENTITY_REGISTRY_ADDRESS ||
      ERC8004_DEFAULT_IDENTITY_REGISTRY) as `0x${string}`,
    reputationRegistryAddress: (process.env.ERC8004_REPUTATION_REGISTRY_ADDRESS ||
      process.env.NEXT_PUBLIC_ERC8004_REPUTATION_REGISTRY_ADDRESS ||
      ERC8004_DEFAULT_REPUTATION_REGISTRY) as `0x${string}`,
    validationRegistryAddress: (process.env.ERC8004_VALIDATION_REGISTRY_ADDRESS ||
      process.env.NEXT_PUBLIC_ERC8004_VALIDATION_REGISTRY_ADDRESS ||
      ERC8004_DEFAULT_VALIDATION_REGISTRY) as `0x${string}`,
  };
}

export function createErc8004PublicClient() {
  const config = getErc8004TrustConfig();
  return createPublicClient({
    chain: sepolia,
    transport: http(config.rpcUrl),
  });
}

export function createErc8004WalletClients(privateKey: `0x${string}`) {
  const config = getErc8004TrustConfig();
  const account = privateKeyToAccount(privateKey);

  return {
    account,
    publicClient: createErc8004PublicClient(),
    walletClient: createWalletClient({
      account,
      chain: sepolia,
      transport: http(config.rpcUrl),
    }),
  };
}

export function buildTrustExplorerUrl(txHash?: string | null) {
  if (!txHash) return null;
  return `${getErc8004TrustConfig().explorerBaseUrl}/tx/${txHash}`;
}

export function buildTrustAddressUrl(address?: string | null) {
  if (!address) return null;
  return `${getErc8004TrustConfig().explorerBaseUrl}/address/${address}`;
}

export function buildRegistryRef(registryAddress: string, chainId = ERC8004_TRUST_CHAIN_ID) {
  return `eip155:${chainId}:${registryAddress}`;
}

export function getAppBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function buildAbsoluteAppUrl(pathname: string) {
  return new URL(pathname, getAppBaseUrl()).toString();
}

export function stableJsonStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(entry => stableJsonStringify(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));

    return `{${entries
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableJsonStringify(entryValue)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value ?? null);
}

export function hashJsonPayload(value: unknown) {
  return keccak256(toBytes(stableJsonStringify(value)));
}

export function toOptionalBytes32(value?: string | null) {
  if (!value) return zeroHash;
  return value as `0x${string}`;
}

export async function parseRegisteredAgentId(txHash: `0x${string}`): Promise<string | null> {
  const receipt = await createErc8004PublicClient().waitForTransactionReceipt({ hash: txHash });

  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: ERC8004_IDENTITY_REGISTRY_ABI,
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName === "Registered") {
        return decoded.args.agentId.toString();
      }
    } catch {
      continue;
    }
  }

  return null;
}
