"use client";

import { UserSyncWrapper } from "./UserSyncWrapper";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { useTheme } from "next-themes";
import { Toaster } from "react-hot-toast";
import { http } from "viem";
import { baseSepolia } from "viem/chains";
import { createConfig } from "wagmi";
import { BottomNav } from "~~/components/BottomNav";
import { TopNav } from "~~/components/TopNav";
import { privyConfig } from "~~/lib/privy";

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <TopNav />
      <main className="pt-20 pb-24 min-h-screen">{children}</main>
      <BottomNav />
      <Toaster />
    </>
  );
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const wagmiConfig = createConfig({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(),
  },
});

export const ScaffoldEthAppWithProviders = ({ children }: { children: React.ReactNode }) => {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  return (
    <PrivyProvider
      appId={privyConfig.appId}
      config={{
        ...privyConfig.config,
        appearance: {
          ...privyConfig.config.appearance,
          theme: isDarkMode ? "dark" : "light",
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <ProgressBar height="3px" color="#2299dd" />
          <UserSyncWrapper>
            <ScaffoldEthApp>{children}</ScaffoldEthApp>
          </UserSyncWrapper>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
};
