import { http } from "viem";
import { baseSepolia } from "viem/chains";
import { createConfig } from "wagmi";

// Minimal wagmi config for use with getPublicClient in hooks
export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(),
  },
});
