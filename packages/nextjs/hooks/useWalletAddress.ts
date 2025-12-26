/**
 * Hook to access current user's wallet address
 *
 * This hook abstracts the Privy user object structure from components,
 * providing a clean API for wallet address access without database fetching.
 *
 * Use this hook when you only need wallet address and auth state.
 * For full user data (chip address, twitter handle, etc.), use useCurrentUser instead.
 */
import { usePrivy } from "@privy-io/react-auth";

interface WalletAddressResult {
  /** The user's wallet address, typed for viem compatibility */
  walletAddress: `0x${string}` | undefined;
  /** Whether the user is authenticated with Privy */
  isAuthenticated: boolean;
  /** Whether Privy has finished initializing */
  isReady: boolean;
  /** Convenience flag: user is authenticated AND has a wallet address */
  isConnected: boolean;
}

export function useWalletAddress(): WalletAddressResult {
  const { ready, authenticated, user } = usePrivy();

  const walletAddress = user?.wallet?.address as `0x${string}` | undefined;

  return {
    walletAddress,
    isAuthenticated: authenticated,
    isReady: ready,
    isConnected: authenticated && !!walletAddress,
  };
}
