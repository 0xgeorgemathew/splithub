import { useAccount, useReadContract } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

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

export function useCreditBalance() {
  const { address, isConnected } = useAccount();
  const { targetNetwork } = useTargetNetwork();

  // Get CreditToken contract address
  const chainContracts = deployedContracts[targetNetwork.id as keyof typeof deployedContracts] as
    | Record<string, { address: string }>
    | undefined;
  const creditTokenAddress = chainContracts?.CreditToken?.address as `0x${string}` | undefined;

  // Read credit balance
  const {
    data: balance,
    refetch: refetchBalance,
    isLoading: isBalanceLoading,
  } = useReadContract({
    address: creditTokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!creditTokenAddress,
    },
  });

  // Read decimals
  const { data: decimals } = useReadContract({
    address: creditTokenAddress,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: {
      enabled: !!creditTokenAddress,
    },
  });

  // Read symbol
  const { data: symbol } = useReadContract({
    address: creditTokenAddress,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: {
      enabled: !!creditTokenAddress,
    },
  });

  // Format balance for display (convert from wei to human readable)
  const formattedBalance =
    balance !== undefined && decimals !== undefined ? Number(balance) / Math.pow(10, decimals) : 0;

  return {
    balance, // Raw balance in wei
    formattedBalance, // Human readable balance
    decimals,
    symbol,
    isConnected,
    isLoading: isBalanceLoading,
    creditTokenAddress,
    refetchBalance,
  };
}
