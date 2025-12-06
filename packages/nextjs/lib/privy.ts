import { baseSepolia } from "viem/chains";

export const privyConfig = {
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  config: {
    loginMethods: ["twitter" as const],
    appearance: {
      theme: "light" as const,
      accentColor: "#1F2937" as `#${string}`,
      logo: "/logo.png",
    },
    embeddedWallets: {
      ethereum: {
        createOnLogin: "users-without-wallets" as const,
      },
      showWalletUIs: false,
    },
    defaultChain: baseSepolia,
    supportedChains: [baseSepolia],
  },
};
