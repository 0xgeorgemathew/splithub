import { useCallback, useEffect, useRef, useState } from "react";
import { usePublicClient } from "wagmi";
import { getBlockExplorerTxLink } from "~~/utils/scaffold-eth";

// Event types for the DotMatrix display
export type TxEventType = "initiated" | "hash" | "network" | "confirmation" | "burned" | "granted" | "error";

export interface TxEvent {
  type: TxEventType;
  timestamp: string; // HH:MM:SS format
  prefix?: string;
  value: string;
  href?: string;
  confirmations?: number;
}

export type TxPhase = "idle" | "initiated" | "broadcasted" | "pending" | "confirming" | "complete" | "error";

interface UseTxEventsOptions {
  txHash: string | null;
  chainId: number;
  creditsSpent: number;
  blockNumber?: string | null;
  networkName?: string;
  fallbackDelayMs?: number;
}

interface UseTxEventsReturn {
  events: TxEvent[];
  currentPhase: TxPhase;
  confirmations: number;
  isUsingFallback: boolean;
}

const TARGET_CONFIRMATIONS = 3;

// Format current time as HH:MM:SS
const getTimestamp = (): string => {
  const now = new Date();
  return now.toTimeString().slice(0, 8);
};

// Truncate hash for display: 0xabc...123
const truncateHash = (hash: string): string => {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
};

export function useTxEvents({
  txHash,
  chainId,
  creditsSpent,
  blockNumber: initialBlockNumber,
  networkName = "Base Sepolia",
  fallbackDelayMs = 3000,
}: UseTxEventsOptions): UseTxEventsReturn {
  const publicClient = usePublicClient({ chainId });

  const [events, setEvents] = useState<TxEvent[]>([]);
  const [currentPhase, setCurrentPhase] = useState<TxPhase>("idle");
  const [confirmations, setConfirmations] = useState(0);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  // Refs for cleanup
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackSequenceRef = useRef<NodeJS.Timeout[]>([]);
  const hasReceivedRealData = useRef(false);

  // Add event helper
  const addEvent = useCallback((event: Omit<TxEvent, "timestamp">) => {
    setEvents(prev => [...prev, { ...event, timestamp: getTimestamp() }]);
  }, []);

  // Cleanup all timeouts
  const cleanup = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    if (fallbackRef.current) {
      clearTimeout(fallbackRef.current);
      fallbackRef.current = null;
    }
    fallbackSequenceRef.current.forEach(t => clearTimeout(t));
    fallbackSequenceRef.current = [];
  }, []);

  // Start fallback simulation sequence
  const startFallbackSequence = useCallback(() => {
    if (hasReceivedRealData.current) return;

    setIsUsingFallback(true);

    // Simulated timing sequence
    const sequence = [
      { delay: 800, event: { type: "network" as const, prefix: "NETWORK:", value: `${networkName} | GAS: SPONSORED` } },
      {
        delay: 1200,
        event: { type: "confirmation" as const, prefix: "CONFIRMATIONS:", value: "1/3", confirmations: 1 },
      },
      {
        delay: 2800,
        event: { type: "confirmation" as const, prefix: "CONFIRMATIONS:", value: "2/3", confirmations: 2 },
      },
      {
        delay: 4400,
        event: { type: "confirmation" as const, prefix: "CONFIRMATIONS:", value: "3/3", confirmations: 3 },
      },
      { delay: 5000, event: { type: "burned" as const, prefix: "CREDITS BURNED:", value: `-${creditsSpent} CR` } },
      { delay: 5200, event: { type: "granted" as const, value: "ACCESS GRANTED — Welcome" } },
    ];

    sequence.forEach(({ delay, event }) => {
      const timeout = setTimeout(() => {
        if (hasReceivedRealData.current) return;

        addEvent(event);
        if (event.confirmations !== undefined) {
          setConfirmations(event.confirmations);
        }
        if (event.type === "confirmation" && event.confirmations === 3) {
          setCurrentPhase("confirming");
        }
        if (event.type === "granted") {
          setCurrentPhase("complete");
        }
      }, delay);
      fallbackSequenceRef.current.push(timeout);
    });
  }, [networkName, creditsSpent, addEvent]);

  // Poll for real confirmations
  const pollConfirmations = useCallback(
    async (blockNum: bigint) => {
      if (!publicClient) return;

      const poll = async () => {
        try {
          const currentBlock = await publicClient.getBlockNumber();
          const confs = Math.min(Number(currentBlock - blockNum) + 1, TARGET_CONFIRMATIONS);

          // Mark that we've received real data
          hasReceivedRealData.current = true;
          setIsUsingFallback(false);

          // Clear fallback sequence
          fallbackSequenceRef.current.forEach(t => clearTimeout(t));
          fallbackSequenceRef.current = [];

          // Update confirmations if changed
          if (confs > confirmations) {
            setConfirmations(confs);
            addEvent({
              type: "confirmation",
              prefix: "CONFIRMATIONS:",
              value: `${confs}/${TARGET_CONFIRMATIONS}`,
              confirmations: confs,
            });
          }

          if (confs < TARGET_CONFIRMATIONS) {
            pollingRef.current = setTimeout(poll, 2000);
          } else {
            // Fully confirmed - add final events
            setCurrentPhase("confirming");

            setTimeout(() => {
              addEvent({
                type: "burned",
                prefix: "CREDITS BURNED:",
                value: `-${creditsSpent} CR`,
              });
            }, 300);

            setTimeout(() => {
              addEvent({
                type: "granted",
                value: "ACCESS GRANTED — Welcome",
              });
              setCurrentPhase("complete");
            }, 500);
          }
        } catch (err) {
          console.error("Polling error:", err);
          // Continue polling even on error
          pollingRef.current = setTimeout(poll, 2000);
        }
      };

      poll();
    },
    [publicClient, confirmations, creditsSpent, addEvent],
  );

  // Effect: Handle txHash changes
  useEffect(() => {
    if (!txHash) {
      // Reset state
      setEvents([]);
      setCurrentPhase("idle");
      setConfirmations(0);
      setIsUsingFallback(false);
      hasReceivedRealData.current = false;
      cleanup();
      return;
    }

    // New transaction - add initiated event
    setCurrentPhase("initiated");
    addEvent({
      type: "initiated",
      value: "TX INITIATED — sending...",
    });

    // Add hash event
    const explorerUrl = getBlockExplorerTxLink(chainId, txHash);
    addEvent({
      type: "hash",
      prefix: "TX HASH:",
      value: truncateHash(txHash),
      href: explorerUrl || undefined,
    });
    setCurrentPhase("broadcasted");

    // Start fallback timer
    fallbackRef.current = setTimeout(() => {
      if (!hasReceivedRealData.current) {
        startFallbackSequence();
      }
    }, fallbackDelayMs);

    // Try to get transaction receipt for real data
    const fetchReceipt = async () => {
      if (!publicClient) return;

      try {
        const receipt = await publicClient.getTransactionReceipt({
          hash: txHash as `0x${string}`,
        });

        if (receipt) {
          hasReceivedRealData.current = true;
          setIsUsingFallback(false);

          // Clear fallback timer
          if (fallbackRef.current) {
            clearTimeout(fallbackRef.current);
            fallbackRef.current = null;
          }

          // Add network event
          addEvent({
            type: "network",
            prefix: "NETWORK:",
            value: `${networkName} | GAS: SPONSORED`,
          });
          setCurrentPhase("pending");

          // Start confirmation polling
          pollConfirmations(receipt.blockNumber);
        }
      } catch {
        // Receipt not yet available, fallback will kick in
        console.log("Receipt not yet available, using fallback");
      }
    };

    // If we have an initial block number, use it directly
    if (initialBlockNumber) {
      hasReceivedRealData.current = true;
      setIsUsingFallback(false);

      if (fallbackRef.current) {
        clearTimeout(fallbackRef.current);
        fallbackRef.current = null;
      }

      addEvent({
        type: "network",
        prefix: "NETWORK:",
        value: `${networkName} | GAS: SPONSORED`,
      });
      setCurrentPhase("pending");

      const blockNum = BigInt(initialBlockNumber);
      pollConfirmations(blockNum);
    } else {
      // Try to fetch receipt
      fetchReceipt();
    }

    return cleanup;
  }, [
    txHash,
    chainId,
    initialBlockNumber,
    networkName,
    fallbackDelayMs,
    publicClient,
    addEvent,
    cleanup,
    pollConfirmations,
    startFallbackSequence,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    events,
    currentPhase,
    confirmations,
    isUsingFallback,
  };
}
