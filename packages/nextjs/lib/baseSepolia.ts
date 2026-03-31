import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

export const BASE_SEPOLIA_MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11" as const;

export function createBaseSepoliaPublicClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });
}

export function createFreshBaseSepoliaPublicClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(undefined, {
      fetchOptions: { cache: "no-store" },
    }),
  });
}

export { baseSepolia };
