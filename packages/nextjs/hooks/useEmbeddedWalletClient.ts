"use client";

import { useCallback } from "react";
import { useWallets } from "@privy-io/react-auth";
import { type Address, type Chain, type Hex, type WalletClient, createWalletClient, custom, toHex } from "viem";
import { useWalletClient } from "wagmi";
import { baseSepolia } from "~~/lib/baseSepolia";

interface SendTransactionParams {
  to: `0x${string}`;
  data?: `0x${string}`;
  value?: bigint;
  chain?: Chain;
}

export function useEmbeddedWalletClient() {
  const { wallets } = useWallets();
  const { data: wagmiWalletClient } = useWalletClient();

  const getWalletClient = useCallback(
    async (chain: Chain = baseSepolia): Promise<WalletClient> => {
      const embeddedWallet = wallets.find(wallet => wallet.walletClientType === "privy");

      if (embeddedWallet) {
        await embeddedWallet.switchChain(chain.id);
        const provider = await embeddedWallet.getEthereumProvider();

        return createWalletClient({
          account: embeddedWallet.address as Address,
          chain,
          transport: custom(provider),
        });
      }

      if (wagmiWalletClient) {
        if (wagmiWalletClient.chain && wagmiWalletClient.chain.id !== chain.id) {
          throw new Error(`Please switch your wallet to ${chain.name}`);
        }

        return wagmiWalletClient as WalletClient;
      }

      throw new Error("No connected wallet available");
    },
    [wallets, wagmiWalletClient],
  );

  const sendTransaction = useCallback(
    async (params: SendTransactionParams): Promise<Hex> => {
      const chain = params.chain || baseSepolia;
      const embeddedWallet = wallets.find(wallet => wallet.walletClientType === "privy");

      if (embeddedWallet) {
        await embeddedWallet.switchChain(chain.id);
        const provider = await embeddedWallet.getEthereumProvider();
        const hash = await provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: embeddedWallet.address,
              to: params.to,
              data: params.data ?? "0x",
              value: toHex(params.value ?? 0n),
            },
          ],
        });

        return hash as Hex;
      }

      const walletClient = await getWalletClient(chain);
      if (!walletClient.account) {
        throw new Error("No connected wallet account available");
      }

      const hash = await walletClient.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: walletClient.account.address,
            to: params.to,
            data: params.data ?? "0x",
            value: toHex(params.value ?? 0n),
          },
        ],
      });

      return hash as Hex;
    },
    [getWalletClient, wallets],
  );

  return { getWalletClient, sendTransaction };
}
