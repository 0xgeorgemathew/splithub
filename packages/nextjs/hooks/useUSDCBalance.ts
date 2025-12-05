import { useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";

// USDC token address on Base Sepolia
const USDC_ADDRESS = "0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a" as const;

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
  const { address, isConnected } = useAccount();

  // Read USDC balance
  const {
    data: balance,
    refetch: refetchBalance,
    isLoading: isBalanceLoading,
  } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
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
    isConnected,
    isLoading: isBalanceLoading,
    usdcAddress: USDC_ADDRESS,
    refetchBalance,
  };
}
