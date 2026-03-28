"use client";

import { useCallback } from "react";
import { useWallets } from "@privy-io/react-auth";
import { type Address, type WalletClient, createWalletClient, custom } from "viem";
import { useWalletClient } from "wagmi";
import { baseSepolia } from "~~/lib/baseSepolia";

export function useEmbeddedWalletClient() {
  const { wallets } = useWallets();
  const { data: wagmiWalletClient } = useWalletClient();

  const getWalletClient = useCallback(async (): Promise<WalletClient> => {
    const embeddedWallet = wallets.find(wallet => wallet.walletClientType === "privy");

    if (embeddedWallet) {
      await embeddedWallet.switchChain(baseSepolia.id);
      const provider = await embeddedWallet.getEthereumProvider();

      return createWalletClient({
        account: embeddedWallet.address as Address,
        chain: baseSepolia,
        transport: custom(provider),
      });
    }

    if (wagmiWalletClient) {
      if (wagmiWalletClient.chain && wagmiWalletClient.chain.id !== baseSepolia.id) {
        throw new Error("Please switch your wallet to Base Sepolia");
      }

      return wagmiWalletClient as WalletClient;
    }

    throw new Error("No connected wallet available");
  }, [wallets, wagmiWalletClient]);

  return { getWalletClient };
}
