"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { execHaloCmdWeb } from "@arx-research/libhalo/api/web";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle, Loader2, Nfc, Send, Terminal, Trash2, Wallet } from "lucide-react";
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

type Status = "idle" | "connecting" | "building" | "signing" | "broadcasting" | "success" | "error";

type LogEntry = {
  time: string;
  type: "info" | "success" | "error" | "data";
  message: string;
};

const ERC20_ABI = [
  {
    name: "decimals",
    type: "function",
    inputs: [],
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
  },
  {
    name: "transfer",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    name: "symbol",
    type: "function",
    inputs: [],
    outputs: [{ type: "string" }],
    stateMutability: "view",
  },
] as const;

export default function TestPage() {
  // Chip state
  const [chipAddress, setChipAddress] = useState<`0x${string}` | null>(null);
  const [chipBalance, setChipBalance] = useState<string | null>(null);
  const [allChipAddresses, setAllChipAddresses] = useState<Record<string, string>>({});

  // Transaction state
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // ETH form
  const [ethTo, setEthTo] = useState("");
  const [ethAmount, setEthAmount] = useState("");

  // Token form
  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenTo, setTokenTo] = useState("");
  const [tokenAmount, setTokenAmount] = useState("");

  // Debug logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const log = useCallback((type: LogEntry["type"], message: string) => {
    const time = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
    setLogs(prev => [...prev, { time, type, message }]);
    // Auto-scroll to bottom
    setTimeout(() => {
      if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      }
    }, 10);
  }, []);

  const clearLogs = () => setLogs([]);

  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: baseSepolia,
        transport: http(),
      }),
    [],
  );

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

  const connectChip = async () => {
    setStatus("connecting");
    setError(null);
    log("info", "Starting chip connection...");
    log("info", "Calling execHaloCmdWeb({ name: 'get_pkeys' })");

    try {
      const result: any = await execHaloCmdWeb({ name: "get_pkeys" });
      log("success", "Got response from chip");
      log("data", `Result keys: ${Object.keys(result).join(", ")}`);

      if (result.publicKeys) {
        log("data", `publicKeys: ${JSON.stringify(result.publicKeys)}`);
      }
      if (result.etherAddresses) {
        log("data", `etherAddresses: ${JSON.stringify(result.etherAddresses)}`);
        // Store all addresses
        setAllChipAddresses(result.etherAddresses);
        // Log each address
        Object.entries(result.etherAddresses).forEach(([slot, addr]) => {
          log("info", `Slot ${slot}: ${addr}`);
        });
      }

      const publicKey = result.publicKeys?.["1"];
      if (!publicKey) {
        throw new Error("No public key found in slot 1");
      }
      log("info", `Public key slot 1: ${publicKey.slice(0, 20)}...`);

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
      // Build transaction
      log("info", "Fetching nonce...");
      const nonce = await publicClient.getTransactionCount({ address: chipAddress });
      log("data", `Nonce: ${nonce}`);

      log("info", "Estimating gas fees...");
      const feeData = await publicClient.estimateFeesPerGas();
      log("data", `maxFeePerGas: ${feeData.maxFeePerGas}`);
      log("data", `maxPriorityFeePerGas: ${feeData.maxPriorityFeePerGas}`);

      const tx = {
        type: "eip1559" as const,
        nonce,
        to: ethTo as `0x${string}`,
        value: parseEther(ethAmount),
        gas: 21000n,
        maxFeePerGas: feeData.maxFeePerGas ?? 1000000000n,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? 1000000n,
        chainId: baseSepolia.id,
      };
      log(
        "data",
        `TX object: ${JSON.stringify({ ...tx, value: tx.value.toString(), gas: tx.gas.toString(), maxFeePerGas: tx.maxFeePerGas.toString(), maxPriorityFeePerGas: tx.maxPriorityFeePerGas.toString() })}`,
      );

      // Serialize and hash
      log("info", "Serializing transaction...");
      const serialized = serializeTransaction(tx);
      log("data", `Serialized (${serialized.length} chars): ${serialized.slice(0, 50)}...`);

      const hash = keccak256(serialized);
      log("data", `TX Hash to sign: ${hash}`);

      setStatus("signing");
      log("info", "Requesting chip signature...");
      log("info", `Calling execHaloCmdWeb({ name: 'sign', keyNo: 1, digest: '${hash.slice(2, 20)}...' })`);

      const sigResult: any = await execHaloCmdWeb({
        name: "sign",
        keyNo: 1,
        digest: hash.slice(2),
      });

      log("success", "Got signature from chip");
      log("data", `Signature result keys: ${Object.keys(sigResult).join(", ")}`);

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

      if (!sigResult.signature?.raw) {
        throw new Error("Invalid signature response from chip - no raw signature");
      }

      const { r, s, v } = sigResult.signature.raw;
      log("info", "Serializing signed transaction...");

      const signedTx = serializeTransaction(tx, {
        r: `0x${r}`,
        s: `0x${s}`,
        v: BigInt(v),
      });
      log("data", `Signed TX (${signedTx.length} chars): ${signedTx.slice(0, 50)}...`);

      setStatus("broadcasting");
      log("info", "Broadcasting transaction...");

      const txHashResult = await publicClient.sendRawTransaction({
        serializedTransaction: signedTx,
      });

      log("success", `Transaction sent! Hash: ${txHashResult}`);
      setTxHash(txHashResult);
      setStatus("success");

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
      log("info", "Fetching token decimals...");
      const decimals = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "decimals",
      });
      log("data", `Token decimals: ${decimals}`);

      log("info", "Encoding transfer function data...");
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [tokenTo as `0x${string}`, parseUnits(tokenAmount, decimals)],
      });
      log("data", `Calldata: ${data.slice(0, 50)}...`);

      log("info", "Estimating gas...");
      const gasEstimate = await publicClient.estimateGas({
        account: chipAddress,
        to: tokenAddress as `0x${string}`,
        data,
      });
      log("data", `Gas estimate: ${gasEstimate}`);

      log("info", "Fetching nonce...");
      const nonce = await publicClient.getTransactionCount({ address: chipAddress });
      log("data", `Nonce: ${nonce}`);

      log("info", "Estimating gas fees...");
      const feeData = await publicClient.estimateFeesPerGas();
      log("data", `maxFeePerGas: ${feeData.maxFeePerGas}`);

      const tx = {
        type: "eip1559" as const,
        nonce,
        to: tokenAddress as `0x${string}`,
        value: 0n,
        data,
        gas: gasEstimate,
        maxFeePerGas: feeData.maxFeePerGas ?? 1000000000n,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? 1000000n,
        chainId: baseSepolia.id,
      };

      log("info", "Serializing transaction...");
      const serialized = serializeTransaction(tx);
      const hash = keccak256(serialized);
      log("data", `TX Hash to sign: ${hash}`);

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

      const { r, s, v } = sigResult.signature.raw;
      log("data", `r=${r?.slice(0, 16)}..., s=${s?.slice(0, 16)}..., v=${v}`);

      log("info", "Serializing signed transaction...");
      const signedTx = serializeTransaction(tx, {
        r: `0x${r}`,
        s: `0x${s}`,
        v: BigInt(v),
      });

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

  const reset = () => {
    setStatus("idle");
    setError(null);
    setTxHash(null);
  };

  const isLoading = status !== "idle" && status !== "success" && status !== "error";

  const getLogColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "info":
        return "text-info";
      case "success":
        return "text-success";
      case "error":
        return "text-error";
      case "data":
        return "text-warning";
      default:
        return "text-base-content";
    }
  };

  return (
    <div className="min-h-screen bg-base-200 p-4 pb-28">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="text-center py-4">
          <h1 className="text-2xl font-bold">Test Transactions</h1>
          <p className="text-sm text-base-content/60 mt-1">Direct chip signing (no relayer)</p>
        </div>

        {/* Connect Section */}
        <motion.div
          className="card bg-base-100 shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="card-body">
            <h2 className="card-title text-lg">
              <Wallet className="w-5 h-5" />
              Chip Wallet
            </h2>

            {chipAddress ? (
              <div className="space-y-3">
                {/* Active Address (Slot 1) - Full */}
                <div className="bg-base-200 rounded-lg p-2">
                  <div className="text-xs text-base-content/60 mb-1">Active (Slot 1)</div>
                  <div className="font-mono text-xs break-all select-all">{chipAddress}</div>
                </div>

                {/* Balance */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-base-content/60">Balance:</span>
                  <span className="font-semibold">{chipBalance ?? "..."} ETH</span>
                </div>

                {/* All Slots */}
                {Object.keys(allChipAddresses).length > 1 && (
                  <div className="border-t border-base-300 pt-2">
                    <div className="text-xs text-base-content/60 mb-2">All Chip Addresses</div>
                    <div className="space-y-1">
                      {Object.entries(allChipAddresses).map(([slot, addr]) => (
                        <div key={slot} className="flex items-start gap-2 text-xs">
                          <span className="text-base-content/50 w-12 flex-shrink-0">Slot {slot}:</span>
                          <span className="font-mono break-all select-all text-base-content/70">{addr}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button className="btn btn-sm btn-outline w-full mt-2" onClick={connectChip} disabled={isLoading}>
                  Refresh
                </button>
              </div>
            ) : (
              <button className="btn btn-primary w-full gap-2" onClick={connectChip} disabled={status === "connecting"}>
                {status === "connecting" ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Tap NFC Chip...
                  </>
                ) : (
                  <>
                    <Nfc className="w-5 h-5" />
                    Tap to Connect
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>

        {/* Send ETH Section */}
        {chipAddress && (
          <motion.div
            className="card bg-base-100 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="card-body">
              <h2 className="card-title text-lg">
                <Send className="w-5 h-5" />
                Send ETH
              </h2>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Recipient address (0x...)"
                  className="input input-bordered w-full text-sm"
                  value={ethTo}
                  onChange={e => setEthTo(e.target.value)}
                  disabled={isLoading}
                />
                <input
                  type="text"
                  placeholder="Amount (ETH)"
                  className="input input-bordered w-full text-sm"
                  value={ethAmount}
                  onChange={e => setEthAmount(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  className="btn btn-primary w-full gap-2"
                  onClick={sendEth}
                  disabled={isLoading || !ethTo || !ethAmount}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {status === "building" && "Building TX..."}
                      {status === "signing" && "Tap to Sign..."}
                      {status === "broadcasting" && "Broadcasting..."}
                    </>
                  ) : (
                    <>
                      <Nfc className="w-5 h-5" />
                      Tap to Send ETH
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Send Token Section */}
        {chipAddress && (
          <motion.div
            className="card bg-base-100 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="card-body">
              <h2 className="card-title text-lg">
                <Send className="w-5 h-5" />
                Send Token
              </h2>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Token address (0x...)"
                  className="input input-bordered w-full text-sm"
                  value={tokenAddress}
                  onChange={e => setTokenAddress(e.target.value)}
                  disabled={isLoading}
                />
                <input
                  type="text"
                  placeholder="Recipient address (0x...)"
                  className="input input-bordered w-full text-sm"
                  value={tokenTo}
                  onChange={e => setTokenTo(e.target.value)}
                  disabled={isLoading}
                />
                <input
                  type="text"
                  placeholder="Amount"
                  className="input input-bordered w-full text-sm"
                  value={tokenAmount}
                  onChange={e => setTokenAmount(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  className="btn btn-primary w-full gap-2"
                  onClick={sendToken}
                  disabled={isLoading || !tokenAddress || !tokenTo || !tokenAmount}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {status === "building" && "Building TX..."}
                      {status === "signing" && "Tap to Sign..."}
                      {status === "broadcasting" && "Broadcasting..."}
                    </>
                  ) : (
                    <>
                      <Nfc className="w-5 h-5" />
                      Tap to Send Token
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Status Section */}
        {(status === "success" || status === "error") && (
          <motion.div
            className={`card shadow-lg ${status === "success" ? "bg-success/10" : "bg-error/10"}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="card-body">
              {status === "success" ? (
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-success flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-success">Transaction Sent!</p>
                    {txHash && (
                      <a
                        href={`https://sepolia.basescan.org/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary underline break-all"
                      >
                        {txHash}
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-error flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-error">Error</p>
                    <p className="text-sm text-base-content/70 break-words">{error}</p>
                  </div>
                </div>
              )}
              <button className="btn btn-sm btn-ghost mt-2" onClick={reset}>
                Dismiss
              </button>
            </div>
          </motion.div>
        )}

        {/* Debug Terminal */}
        <motion.div
          className="card bg-base-300 shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="card-body p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="card-title text-sm">
                <Terminal className="w-4 h-4" />
                Debug Log
              </h2>
              <button className="btn btn-xs btn-ghost gap-1" onClick={clearLogs}>
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>
            <div ref={logContainerRef} className="bg-base-100 rounded-lg p-2 h-48 overflow-y-auto font-mono text-xs">
              {logs.length === 0 ? (
                <p className="text-base-content/40 italic">No logs yet. Tap to connect...</p>
              ) : (
                logs.map((entry, i) => (
                  <div key={i} className="flex gap-2 leading-relaxed">
                    <span className="text-base-content/40 flex-shrink-0">{entry.time}</span>
                    <span className={`${getLogColor(entry.type)} break-all`}>{entry.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>

        {/* Info */}
        <div className="text-center text-xs text-base-content/50 py-2">
          <p>Chain: Base Sepolia (84532)</p>
          <p>Chip must have ETH for gas</p>
        </div>
      </div>
    </div>
  );
}
