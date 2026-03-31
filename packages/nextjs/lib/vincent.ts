import type { NextRequest, NextResponse } from "next/server";
import "server-only";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, createFreshBaseSepoliaPublicClient } from "~~/lib/baseSepolia";

export const DEFAULT_VINCENT_APP_ID = 5854929226;
export const VINCENT_CONNECT_JWT_QUERY_PARAM = "jwt";
export const VINCENT_SESSION_COOKIE = "splithub_vincent_jwt";
export const VINCENT_RETURN_TO_COOKIE = "splithub_vincent_return_to";

const DEFAULT_RETURN_TO = "/defi";
const VINCENT_DASHBOARD_URL = "https://dashboard.heyvincent.ai";
const BASE_SEPOLIA_RPC_URL = baseSepolia.rpcUrls.default.http[0] ?? "https://sepolia.base.org";
const DEFAULT_PUBLIC_APP_ORIGIN = "https://dev.splithub.space";
const DEFAULT_ALLOWED_PUBLIC_ORIGINS = ["https://dev.splithub.space", "https://splithub.space"];

export class VincentConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VincentConfigurationError";
  }
}

export class VincentAuthenticationError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = "VincentAuthenticationError";
    this.statusCode = statusCode;
  }
}

export interface VincentConfig {
  appId: number;
  delegateePrivateKey: string;
  delegateeAddress: string;
}

export interface VincentAppUserContext {
  jwt: string;
  decodedJwt: VincentJwtPayload;
  pkpAddress: string;
  pkpPublicKey: string;
  agentAddress: string;
}

interface VincentJwtPayload {
  payload: {
    exp: number;
    pkpInfo?: {
      ethAddress?: string;
      publicKey?: string;
    };
  };
}

interface AbilityClientLike {
  execute: (params: Record<string, unknown>, context: Record<string, unknown>) => Promise<any>;
}

interface AbilityClients {
  approval: AbilityClientLike;
  transfer: AbilityClientLike;
  transactionSigner: AbilityClientLike;
}

let cachedAbilityClientsPromise: Promise<AbilityClients> | null = null;

function parseVincentAppId(rawValue: string | undefined): number {
  if (!rawValue) {
    return DEFAULT_VINCENT_APP_ID;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new VincentConfigurationError("Vincent app ID must be a positive integer");
  }

  return parsed;
}

function readDelegateePrivateKey(): string | null {
  const configuredKey = process.env.VINCENT_DELEGATEE_PRIVATE_KEY ?? process.env.RELAYER_PRIVATE_KEY;
  if (!configuredKey) {
    return null;
  }

  const trimmed = configuredKey.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

export function getOptionalVincentConfigFromEnv(): VincentConfig | null {
  const delegateePrivateKey = readDelegateePrivateKey();
  if (!delegateePrivateKey) {
    return null;
  }

  const appId = parseVincentAppId(process.env.VINCENT_APP_ID ?? process.env.NEXT_PUBLIC_VINCENT_APP_ID);
  const delegateeWallet = privateKeyToAccount(delegateePrivateKey as `0x${string}`);

  return {
    appId,
    delegateePrivateKey,
    delegateeAddress: delegateeWallet.address,
  };
}

export function getVincentConfigFromEnv(): VincentConfig {
  const config = getOptionalVincentConfigFromEnv();
  if (!config) {
    throw new VincentConfigurationError(
      "Vincent delegatee key not configured. Set VINCENT_DELEGATEE_PRIVATE_KEY or RELAYER_PRIVATE_KEY.",
    );
  }

  return config;
}

export function getVincentRegistryRpcUrl() {
  return BASE_SEPOLIA_RPC_URL;
}

export function getRequestOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? request.headers.get("host");
  const proto = forwardedProto ?? (host?.includes("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https");

  if (host) {
    return `${proto}://${host}`;
  }

  return request.nextUrl.origin;
}

function isLocalOrigin(origin: string) {
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function normalizeOrigin(origin: string) {
  return new URL(origin).origin;
}

function getAllowedPublicOrigins() {
  const configuredOrigins = process.env.VINCENT_ALLOWED_ORIGINS ?? process.env.NEXT_PUBLIC_VINCENT_ALLOWED_ORIGINS;
  if (!configuredOrigins) {
    return DEFAULT_ALLOWED_PUBLIC_ORIGINS;
  }

  return configuredOrigins
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)
    .map(normalizeOrigin);
}

export function getVincentAppOrigin(requestOrigin?: string) {
  const configuredOrigin = process.env.VINCENT_APP_URL ?? process.env.NEXT_PUBLIC_VINCENT_APP_URL;
  if (configuredOrigin) {
    return normalizeOrigin(configuredOrigin);
  }

  if (requestOrigin && !isLocalOrigin(requestOrigin)) {
    const normalizedRequestOrigin = normalizeOrigin(requestOrigin);
    if (getAllowedPublicOrigins().includes(normalizedRequestOrigin)) {
      return normalizedRequestOrigin;
    }
  }

  return DEFAULT_PUBLIC_APP_ORIGIN;
}

export function getVincentCallbackUrl(origin: string) {
  return new URL("/api/vincent/callback", getVincentAppOrigin(origin)).toString();
}

export function getVincentConnectUrl(params: { appId: number; redirectUri: string }) {
  const url = new URL(`/user/appId/${params.appId}/connect`, VINCENT_DASHBOARD_URL);
  url.searchParams.set("redirectUri", params.redirectUri);
  return url.toString();
}

export function sanitizeReturnToPath(value: string | null | undefined) {
  if (!value || typeof value !== "string") {
    return DEFAULT_RETURN_TO;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_RETURN_TO;
  }

  return value;
}

export function getReturnToFromRequest(request: NextRequest) {
  return sanitizeReturnToPath(request.nextUrl.searchParams.get("returnTo"));
}

function getJwtFromAuthorizationHeader(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

export function getVincentSessionJwt(request: NextRequest) {
  return getJwtFromAuthorizationHeader(request) ?? request.cookies.get(VINCENT_SESSION_COOKIE)?.value ?? null;
}

export function clearVincentSession(response: NextResponse) {
  response.cookies.set(VINCENT_SESSION_COOKIE, "", {
    path: "/",
    expires: new Date(0),
  });
  response.cookies.set(VINCENT_RETURN_TO_COOKIE, "", {
    path: "/",
    expires: new Date(0),
  });
}

export function setVincentReturnToCookie(response: NextResponse, returnTo: string) {
  response.cookies.set(VINCENT_RETURN_TO_COOKIE, sanitizeReturnToPath(returnTo), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 10,
  });
}

export function setVincentSessionCookie(
  response: NextResponse,
  params: { jwt: string; decodedJwt: VincentJwtPayload },
) {
  response.cookies.set(VINCENT_SESSION_COOKIE, params.jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    expires: new Date(params.decodedJwt.payload.exp * 1000),
  });
}

export function getVincentStoredReturnTo(request: NextRequest) {
  return sanitizeReturnToPath(request.cookies.get(VINCENT_RETURN_TO_COOKIE)?.value);
}

function getVincentJwtModule() {
  return require("@lit-protocol/vincent-app-sdk/jwt") as {
    verifyVincentAppUserJWT: (params: {
      jwt: string;
      expectedAudience: string;
      requiredAppId: number;
    }) => Promise<VincentJwtPayload>;
  };
}

function getVincentContractsModule() {
  return require("@lit-protocol/vincent-contracts-sdk") as {
    deriveAgentAddress: (publicClient: unknown, userControllerAddress: string, appId: number) => Promise<string>;
  };
}

export async function verifyVincentJwtForRequest(request: NextRequest, jwt: string): Promise<VincentJwtPayload> {
  const config = getVincentConfigFromEnv();
  const { verifyVincentAppUserJWT } = getVincentJwtModule();
  return verifyVincentAppUserJWT({
    jwt,
    expectedAudience: getVincentCallbackUrl(getVincentAppOrigin(getRequestOrigin(request))),
    requiredAppId: config.appId,
  });
}

export async function requireVincentAppUser(request: NextRequest): Promise<VincentAppUserContext> {
  const jwt = getVincentSessionJwt(request);
  if (!jwt) {
    throw new VincentAuthenticationError("Connect Vincent before using this action.");
  }

  const decodedJwt = await verifyVincentJwtForRequest(request, jwt);
  const pkpAddress = decodedJwt.payload.pkpInfo?.ethAddress;
  const pkpPublicKey = decodedJwt.payload.pkpInfo?.publicKey;

  if (!pkpAddress || !pkpPublicKey) {
    throw new VincentAuthenticationError("Vincent session is missing PKP information.");
  }

  const { appId } = getVincentConfigFromEnv();
  const { deriveAgentAddress } = getVincentContractsModule();
  const agentAddress = await deriveAgentAddress(createFreshBaseSepoliaPublicClient(), pkpAddress, appId);

  return {
    jwt,
    decodedJwt,
    pkpAddress,
    pkpPublicKey,
    agentAddress,
  };
}

async function createAbilityClients(config: VincentConfig): Promise<AbilityClients> {
  const { getVincentAbilityClient } = require("@lit-protocol/vincent-app-sdk/abilityClient") as {
    getVincentAbilityClient: (params: Record<string, unknown>) => AbilityClientLike;
  };
  const approvalModule = require("@lit-protocol/vincent-ability-erc20-approval") as {
    bundledVincentAbility: unknown;
  };
  const transferModule = require("@lit-protocol/vincent-ability-erc20-transfer") as {
    bundledVincentAbility: unknown;
  };
  const signerModule = require("@lit-protocol/vincent-ability-evm-transaction-signer") as {
    bundledVincentAbility: unknown;
  };
  const { Wallet } = require("ethers") as {
    Wallet: new (privateKey: string) => unknown;
  };
  const ethersSigner = new Wallet(config.delegateePrivateKey);

  return {
    approval: getVincentAbilityClient({
      bundledVincentAbility: approvalModule.bundledVincentAbility,
      ethersSigner,
      debug: false,
      registryRpcUrl: BASE_SEPOLIA_RPC_URL,
      pkpInfoRpcUrl: BASE_SEPOLIA_RPC_URL,
    }),
    transfer: getVincentAbilityClient({
      bundledVincentAbility: transferModule.bundledVincentAbility,
      ethersSigner,
      debug: false,
      registryRpcUrl: BASE_SEPOLIA_RPC_URL,
      pkpInfoRpcUrl: BASE_SEPOLIA_RPC_URL,
    }),
    transactionSigner: getVincentAbilityClient({
      bundledVincentAbility: signerModule.bundledVincentAbility,
      ethersSigner,
      debug: false,
      registryRpcUrl: BASE_SEPOLIA_RPC_URL,
      pkpInfoRpcUrl: BASE_SEPOLIA_RPC_URL,
    }),
  };
}

export async function getVincentAbilityClients() {
  if (!cachedAbilityClientsPromise) {
    cachedAbilityClientsPromise = createAbilityClients(getVincentConfigFromEnv());
  }

  return cachedAbilityClientsPromise;
}
