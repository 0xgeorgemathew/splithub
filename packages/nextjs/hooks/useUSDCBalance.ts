import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useReadContract } from "wagmi";
import { TOKENS } from "~~/config/tokens";

// USDC token address from centralized config
const USDC_ADDRESS = TOKENS.USDC;

// ERC20 ABI for balance and decimals
const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
] as const;

export function useUSDCBalance() {
  const { address: wagmiAddress, isConnected } = useAccount();
  const { user } = usePrivy();

  // Use Privy wallet address if available, fallback to wagmi address
  const address = (user?.wallet?.address as `0x${string}` | undefined) ?? wagmiAddress;

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
