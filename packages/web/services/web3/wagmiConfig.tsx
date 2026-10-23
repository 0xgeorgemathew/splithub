import { http } from "viem";
import { baseSepolia, sepolia } from "viem/chains";
import { createConfig } from "wagmi";

// Minimal wagmi config for use with getPublicClient in hooks
export const wagmiConfig = createConfig({
  chains: [baseSepolia, sepolia],
  transports: {
    [baseSepolia.id]: http(),
    [sepolia.id]: http(),
  },
});
