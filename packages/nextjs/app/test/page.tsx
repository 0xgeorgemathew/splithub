"use client";

/**
 * =============================================================================
 * TEST PAGE - Direct Chip-to-Chain Transactions (No Relayer)
 * =============================================================================
 *
 * PURPOSE:
 * This page tests sending ETH and ERC-20 tokens directly from a Halo NFC chip
 * WITHOUT using the app's gasless relayer system. The chip itself pays for gas.
 *
 * WHY THIS EXISTS:
 * The main SplitHub app uses a relayer pattern where:
 *   1. User signs EIP-712 typed data with their chip
 *   2. Relayer receives the signature and submits the TX (paying gas)
 *   3. Smart contract verifies signature and executes transfer
 *
 * This test page bypasses all of that to test raw transaction signing:
 *   1. User taps chip to get public keys/addresses
 *   2. App builds an unsigned transaction
 *   3. User taps chip to sign the raw TX hash (digest)
 *   4. App broadcasts the signed TX directly to the network
 *
 * KEY DIFFERENCES FROM MAIN APP:
 * - No relayer API calls
 * - No EIP-712 typed data (raw digest signing)
 * - Chip address pays gas fees (must have ETH)
 * - No SplitHub smart contracts involved
 * - Uses key slot 1 (slot 2 has RAW_DIGEST_PROHIBITED)
 *
 * FLOW:
 * [Tap to Connect] → get_pkeys → derive addresses → show wallet
 *        ↓
 * [User fills form] → recipient + amount
 *        ↓
 * [Tap to Send] → build TX → serialize → keccak256 hash
 *        ↓
 * [Chip signs] → sign digest → get r,s,v
 *        ↓
 * [Broadcast] → serialize with signature → sendRawTransaction
 *
 * =============================================================================
 */
import { useCallback, useMemo, useState } from "react";
import {
  ChipWalletCard,
  DebugTerminal,
  ERC20_ABI,
  LogEntry,
  SendEthCard,
  SendTokenCard,
  Status,
  StatusCard,
} from "./_components";
import { execHaloCmdWeb } from "@arx-research/libhalo/api/web";
import {
  createPublicClient,
  encodeFunctionData,
  formatEther,
  http,
  keccak256,
  parseEther,
  parseUnits,
  serializeTransaction,
} from "viem";
import { baseSepolia } from "viem/chains";

export default function TestPage() {
  // =========================================================================
  // STATE
  // =========================================================================

  // Chip wallet state - populated after "Tap to Connect"
  const [chipAddress, setChipAddress] = useState<`0x${string}` | null>(null);
  const [chipBalance, setChipBalance] = useState<string | null>(null);
  const [allChipAddresses, setAllChipAddresses] = useState<Record<string, string>>({});

  // Transaction flow state - tracks progress through build/sign/broadcast
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Form inputs for ETH transfer
  const [ethTo, setEthTo] = useState("");
  const [ethAmount, setEthAmount] = useState("");

  // Form inputs for ERC-20 token transfer
  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenTo, setTokenTo] = useState("");
  const [tokenAmount, setTokenAmount] = useState("");

  // Debug terminal logs - visible in UI since we can't access browser console
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // =========================================================================
  // UTILITIES
  // =========================================================================

  /**
   * Logging utility that displays in the debug terminal.
   * Useful because this runs on mobile where console isn't accessible.
   */
  const log = useCallback((type: LogEntry["type"], message: string) => {
    const time = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
    setLogs(prev => [...prev, { time, type, message }]);
  }, []);

  const clearLogs = () => setLogs([]);

  /**
   * Viem public client for reading chain data and broadcasting transactions.
   * Connected to Base Sepolia testnet.
   */
  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: baseSepolia,
        transport: http(),
      }),
    [],
  );

  /**
   * Fetches ETH balance for a given address.
   * Called after connecting chip and after successful transactions.
   */
  const refreshBalance = async (address: `0x${string}`) => {
    try {
      log("info", `Fetching balance for ${address.slice(0, 10)}...`);
      const balance = await publicClient.getBalance({ address });
      const formatted = formatEther(balance);
      setChipBalance(formatted);
      log("success", `Balance: ${formatted} ETH`);
    } catch (err) {
      log("error", `Failed to fetch balance: ${err}`);
    }
  };

  // =========================================================================
  // CHIP CONNECTION
  // =========================================================================

  /**
   * Connects to the Halo chip and retrieves all public keys/addresses.
   *
   * Uses the "get_pkeys" command which returns:
   * - publicKeys: { "1": "04abc...", "2": "04def...", "3": "04ghi..." }
   * - etherAddresses: { "1": "0xABC...", "2": "0xDEF...", "3": "0xGHI..." }
   *
   * We use slot 1 for transactions because slot 2 has RAW_DIGEST_PROHIBITED
   * which prevents signing arbitrary hashes (security feature).
   */
  const connectChip = async () => {
    setStatus("connecting");
    setError(null);
    log("info", "Starting chip connection...");
    log("info", "Calling execHaloCmdWeb({ name: 'get_pkeys' })");

    try {
      const result: any = await execHaloCmdWeb({ name: "get_pkeys" });
      log("success", "Got response from chip");
      log("data", `Result keys: ${Object.keys(result).join(", ")}`);

      // Log all available public keys
      if (result.publicKeys) {
        log("data", `publicKeys: ${JSON.stringify(result.publicKeys)}`);
      }

      // Store and display all Ethereum addresses from the chip
      if (result.etherAddresses) {
        log("data", `etherAddresses: ${JSON.stringify(result.etherAddresses)}`);
        setAllChipAddresses(result.etherAddresses);

        // Log ALL slots from get_pkeys
        Object.entries(result.etherAddresses).forEach(([slot, addr]) => {
          log("info", `Slot ${slot}: ${addr}`);
        });

        // Check slot 9 (BurnerOS wallet slot - password protected)
        try {
          log("info", "Checking slot 9 (Burner wallet)...");
          const slot9Result: any = await execHaloCmdWeb({
            name: "get_key_info",
            keyNo: 9,
          });

          if (slot9Result.publicKey) {
            // Derive Ethereum address: remove 04 prefix, keccak256 hash, take last 20 bytes
            const pubKeyNoPrefix = slot9Result.publicKey.slice(2);
            const hash = keccak256(`0x${pubKeyNoPrefix}`);
            const burnerAddress = `0x${hash.slice(-40)}` as `0x${string}`;
            log("success", `Slot 9 (Burner): ${burnerAddress}`);
            setAllChipAddresses(prev => ({ ...prev, "9": burnerAddress }));
          }
        } catch (slot9Err) {
          log("info", `Slot 9 not accessible: ${slot9Err instanceof Error ? slot9Err.message : String(slot9Err)}`);
        }
      }

      // Verify slot 1 exists (our signing slot)
      const publicKey = result.publicKeys?.["1"];
      if (!publicKey) {
        throw new Error("No public key found in slot 1");
      }
      log("info", `Public key slot 1: ${publicKey.slice(0, 20)}...`);

      // Use slot 1 address as the active wallet
      const address = result.etherAddresses?.["1"] as `0x${string}`;
      if (!address) {
        throw new Error("Could not derive address from chip");
      }
      log("success", `Using slot 1 address: ${address}`);

      setChipAddress(address);
      await refreshBalance(address);
      setStatus("idle");
      log("success", "Chip connected successfully!");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      log("error", `Connect failed: ${errMsg}`);
      setError(errMsg);
      setStatus("error");
    }
  };

  // =========================================================================
  // SEND ETH
  // =========================================================================

  /**
   * Sends ETH directly from the chip address.
   *
   * Process:
   * 1. BUILD: Fetch nonce and gas prices, construct unsigned EIP-1559 TX
   * 2. HASH: Serialize TX and compute keccak256 hash (this is what gets signed)
   * 3. SIGN: Chip signs the raw hash digest, returns r/s/v signature components
   * 4. BROADCAST: Append signature to TX and send via sendRawTransaction
   *
   * Gas is fixed at 21000 for simple ETH transfers.
   */
  const sendEth = async () => {
    if (!chipAddress || !ethTo || !ethAmount) {
      setError("Please fill in all fields");
      return;
    }

    setStatus("building");
    setError(null);
    setTxHash(null);
    log("info", "=== Starting ETH Transfer ===");
    log("info", `To: ${ethTo}`);
    log("info", `Amount: ${ethAmount} ETH`);

    try {
      // Step 1: Fetch chain state needed for transaction
      log("info", "Fetching nonce...");
      const nonce = await publicClient.getTransactionCount({ address: chipAddress });
      log("data", `Nonce: ${nonce}`);

      log("info", "Estimating gas fees...");
      const feeData = await publicClient.estimateFeesPerGas();
      log("data", `maxFeePerGas: ${feeData.maxFeePerGas}`);
      log("data", `maxPriorityFeePerGas: ${feeData.maxPriorityFeePerGas}`);

      // Step 2: Build unsigned transaction object
      // Using EIP-1559 format with maxFeePerGas and maxPriorityFeePerGas
      const tx = {
        type: "eip1559" as const,
        nonce,
        to: ethTo as `0x${string}`,
        value: parseEther(ethAmount),
        gas: 21000n, // Fixed gas for simple ETH transfer
        maxFeePerGas: feeData.maxFeePerGas ?? 1000000000n,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? 1000000n,
        chainId: baseSepolia.id,
      };
      log(
        "data",
        `TX object: ${JSON.stringify({
          ...tx,
          value: tx.value.toString(),
          gas: tx.gas.toString(),
          maxFeePerGas: tx.maxFeePerGas.toString(),
          maxPriorityFeePerGas: tx.maxPriorityFeePerGas.toString(),
        })}`,
      );

      // Step 3: Serialize and hash the transaction
      // The hash is what the chip will sign
      log("info", "Serializing transaction...");
      const serialized = serializeTransaction(tx);
      log("data", `Serialized (${serialized.length} chars): ${serialized.slice(0, 50)}...`);

      const hash = keccak256(serialized);
      log("data", `TX Hash to sign: ${hash}`);

      // Step 4: Request chip signature
      // IMPORTANT: digest must NOT have 0x prefix for libhalo
      setStatus("signing");
      log("info", "Requesting chip signature...");
      log("info", `Calling execHaloCmdWeb({ name: 'sign', keyNo: 1, digest: '${hash.slice(2, 20)}...' })`);

      const sigResult: any = await execHaloCmdWeb({
        name: "sign",
        keyNo: 1, // Must use slot 1 (slot 2 prohibits raw digest signing)
        digest: hash.slice(2), // Remove 0x prefix
      });

      log("success", "Got signature from chip");
      log("data", `Signature result keys: ${Object.keys(sigResult).join(", ")}`);

      // Log signature details for debugging
      if (sigResult.signature) {
        log("data", `signature keys: ${Object.keys(sigResult.signature).join(", ")}`);
        if (sigResult.signature.raw) {
          log(
            "data",
            `raw signature: r=${sigResult.signature.raw.r?.slice(0, 16)}..., s=${sigResult.signature.raw.s?.slice(0, 16)}..., v=${sigResult.signature.raw.v}`,
          );
        }
        if (sigResult.signature.ether) {
          log("data", `ether signature: ${sigResult.signature.ether.slice(0, 40)}...`);
        }
      }

      // Validate signature response
      if (!sigResult.signature?.raw) {
        throw new Error("Invalid signature response from chip - no raw signature");
      }

      // Step 5: Serialize signed transaction
      // Combine original TX with signature components (r, s, v)
      const { r, s, v } = sigResult.signature.raw;
      log("info", "Serializing signed transaction...");

      const signedTx = serializeTransaction(tx, {
        r: `0x${r}`,
        s: `0x${s}`,
        v: BigInt(v),
      });
      log("data", `Signed TX (${signedTx.length} chars): ${signedTx.slice(0, 50)}...`);

      // Step 6: Broadcast to network
      setStatus("broadcasting");
      log("info", "Broadcasting transaction...");

      const txHashResult = await publicClient.sendRawTransaction({
        serializedTransaction: signedTx,
      });

      log("success", `Transaction sent! Hash: ${txHashResult}`);
      setTxHash(txHashResult);
      setStatus("success");

      // Refresh balance to show updated amount
      await refreshBalance(chipAddress);
      log("success", "=== ETH Transfer Complete ===");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      log("error", `ETH transfer failed: ${errMsg}`);
      if (err instanceof Error && err.stack) {
        log("error", `Stack: ${err.stack.split("\n").slice(0, 3).join(" | ")}`);
      }
      setError(errMsg);
      setStatus("error");
    }
  };

  // =========================================================================
  // SEND TOKEN (ERC-20)
  // =========================================================================

  /**
   * Sends ERC-20 tokens from the chip address.
   *
   * Similar to sendEth but:
   * - Calls token contract's transfer(to, amount) function
   * - Needs to fetch token decimals for proper amount formatting
   * - Estimates gas (not fixed like ETH transfer)
   * - TX value is 0 (no ETH being sent), data contains the function call
   */
  const sendToken = async () => {
    if (!chipAddress || !tokenAddress || !tokenTo || !tokenAmount) {
      setError("Please fill in all fields");
      return;
    }

    setStatus("building");
    setError(null);
    setTxHash(null);
    log("info", "=== Starting Token Transfer ===");
    log("info", `Token: ${tokenAddress}`);
    log("info", `To: ${tokenTo}`);
    log("info", `Amount: ${tokenAmount}`);

    try {
      // Step 1: Get token decimals (needed to format amount correctly)
      // e.g., USDC has 6 decimals, so 1 USDC = 1000000 in raw units
      log("info", "Fetching token decimals...");
      const decimals = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "decimals",
      });
      log("data", `Token decimals: ${decimals}`);

      // Step 2: Encode the transfer function call
      // This creates the calldata for: transfer(recipient, amount)
      log("info", "Encoding transfer function data...");
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [tokenTo as `0x${string}`, parseUnits(tokenAmount, decimals)],
      });
      log("data", `Calldata: ${data.slice(0, 50)}...`);

      // Step 3: Estimate gas for the token transfer
      // Unlike ETH transfers, this varies based on token contract complexity
      log("info", "Estimating gas...");
      const gasEstimate = await publicClient.estimateGas({
        account: chipAddress,
        to: tokenAddress as `0x${string}`,
        data,
      });
      log("data", `Gas estimate: ${gasEstimate}`);

      // Step 4: Fetch nonce and gas prices
      log("info", "Fetching nonce...");
      const nonce = await publicClient.getTransactionCount({ address: chipAddress });
      log("data", `Nonce: ${nonce}`);

      log("info", "Estimating gas fees...");
      const feeData = await publicClient.estimateFeesPerGas();
      log("data", `maxFeePerGas: ${feeData.maxFeePerGas}`);

      // Step 5: Build unsigned transaction
      // Note: value is 0n (not sending ETH), data contains the transfer call
      const tx = {
        type: "eip1559" as const,
        nonce,
        to: tokenAddress as `0x${string}`, // Token contract address
        value: 0n, // No ETH being sent
        data, // The encoded transfer(to, amount) call
        gas: gasEstimate,
        maxFeePerGas: feeData.maxFeePerGas ?? 1000000000n,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? 1000000n,
        chainId: baseSepolia.id,
      };

      // Step 6: Serialize and hash
      log("info", "Serializing transaction...");
      const serialized = serializeTransaction(tx);
      const hash = keccak256(serialized);
      log("data", `TX Hash to sign: ${hash}`);

      // Step 7: Request chip signature
      setStatus("signing");
      log("info", "Requesting chip signature...");

      const sigResult: any = await execHaloCmdWeb({
        name: "sign",
        keyNo: 1,
        digest: hash.slice(2),
      });

      log("success", "Got signature from chip");
      log("data", `Signature result keys: ${Object.keys(sigResult).join(", ")}`);

      if (!sigResult.signature?.raw) {
        throw new Error("Invalid signature response from chip - no raw signature");
      }

      // Step 8: Serialize signed transaction
      const { r, s, v } = sigResult.signature.raw;
      log("data", `r=${r?.slice(0, 16)}..., s=${s?.slice(0, 16)}..., v=${v}`);

      log("info", "Serializing signed transaction...");
      const signedTx = serializeTransaction(tx, {
        r: `0x${r}`,
        s: `0x${s}`,
        v: BigInt(v),
      });

      // Step 9: Broadcast
      setStatus("broadcasting");
      log("info", "Broadcasting transaction...");

      const txHashResult = await publicClient.sendRawTransaction({
        serializedTransaction: signedTx,
      });

      log("success", `Transaction sent! Hash: ${txHashResult}`);
      setTxHash(txHashResult);
      setStatus("success");

      await refreshBalance(chipAddress);
      log("success", "=== Token Transfer Complete ===");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      log("error", `Token transfer failed: ${errMsg}`);
      if (err instanceof Error && err.stack) {
        log("error", `Stack: ${err.stack.split("\n").slice(0, 3).join(" | ")}`);
      }
      setError(errMsg);
      setStatus("error");
    }
  };

  // =========================================================================
  // UI HELPERS
  // =========================================================================

  /** Resets status/error/txHash to allow a new transaction */
  const reset = () => {
    setStatus("idle");
    setError(null);
    setTxHash(null);
  };

  /** True when any async operation is in progress (disables buttons) */
  const isLoading = status !== "idle" && status !== "success" && status !== "error";

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="min-h-screen bg-base-200 p-4 pb-28">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="text-center py-4">
          <h1 className="text-2xl font-bold">Test Transactions</h1>
          <p className="text-sm text-base-content/60 mt-1">Direct chip signing (no relayer)</p>
        </div>

        {/* Chip wallet connection card */}
        <ChipWalletCard
          chipAddress={chipAddress}
          chipBalance={chipBalance}
          allChipAddresses={allChipAddresses}
          status={status}
          isLoading={isLoading}
          onConnect={connectChip}
        />

        {/* Transaction forms - only shown after chip is connected */}
        {chipAddress && (
          <>
            <SendEthCard
              ethTo={ethTo}
              ethAmount={ethAmount}
              status={status}
              isLoading={isLoading}
              onEthToChange={setEthTo}
              onEthAmountChange={setEthAmount}
              onSend={sendEth}
            />

            <SendTokenCard
              tokenAddress={tokenAddress}
              tokenTo={tokenTo}
              tokenAmount={tokenAmount}
              status={status}
              isLoading={isLoading}
              onTokenAddressChange={setTokenAddress}
              onTokenToChange={setTokenTo}
              onTokenAmountChange={setTokenAmount}
              onSend={sendToken}
            />
          </>
        )}

        {/* Success/Error status display */}
        <StatusCard status={status} txHash={txHash} error={error} onDismiss={reset} />

        {/* Debug log terminal - essential for mobile testing */}
        <DebugTerminal logs={logs} onClear={clearLogs} />

        {/* Footer info */}
        <div className="text-center text-xs text-base-content/50 py-2">
          <p>Chain: Base Sepolia (84532)</p>
          <p>Chip must have ETH for gas</p>
        </div>
      </div>
    </div>
  );
}
