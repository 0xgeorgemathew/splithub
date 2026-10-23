import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useReadContract } from "wagmi";
import { TOKENS } from "~~/config/tokens";
import { ERC20_ABI } from "~~/lib/contractAbis";

// USDC token address from centralized config
const USDC_ADDRESS = TOKENS.USDC;

export function useUSDCBalance(addressOverride?: `0x${string}` | null) {
  const { address: wagmiAddress, isConnected } = useAccount();
  const { user } = usePrivy();

  // Use Privy wallet address if available, fallback to wagmi address
  const address = addressOverride ?? (user?.wallet?.address as `0x${string}` | undefined) ?? wagmiAddress;

  // Read USDC balance
  const {
    data: balance,
    refetch: refetchBalance,
    isLoading: isBalanceLoading,
    isFetching: isBalanceFetching,
  } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchOnMount: true,
      staleTime: 0,
    },
  });

  // Read decimals
  const { data: decimals } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: {
      enabled: true,
    },
  });

  // Read symbol
  const { data: symbol } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: {
      enabled: true,
    },
  });

  // Format balance for display (USDC has 6 decimals)
  const formattedBalance =
    balance !== undefined && decimals !== undefined ? Number(balance) / Math.pow(10, decimals) : 0;

  // Refetch when address becomes available
  useEffect(() => {
    if (address) {
      refetchBalance();
    }
  }, [address, refetchBalance]);

  // Listen for balance refresh events
  useEffect(() => {
    const handleRefresh = () => {
      console.log("USDC balance refresh event received, refetching...");
      refetchBalance();
    };
    window.addEventListener("refreshBalances", handleRefresh);

    return () => {
      window.removeEventListener("refreshBalances", handleRefresh);
    };
  }, [refetchBalance]);

  return {
    balance, // Raw balance in wei
    formattedBalance, // Human readable balance
    decimals,
    symbol,
    isConnected: isConnected || !!address,
    isLoading: isBalanceLoading || isBalanceFetching,
    usdcAddress: USDC_ADDRESS,
    refetchBalance,
  };
}
