import { useCallback, useState } from "react";
import { type Address, parseUnits } from "viem";
import { TOKEN_DECIMALS } from "~~/config/tokens";
import { useTapPayment } from "~~/hooks/useTapPayment";
import { apiFetch } from "~~/lib/apiFetch";
import type { Stall } from "~~/lib/events.types";
import { parseContractError } from "~~/utils/contractErrors";

export type StallPaymentFlowState =
  | "idle"
  | "preparing"
  | "tapping"
  | "submitting"
  | "confirming"
  | "success"
  | "error";

interface UseStallPaymentOptions {
  stall: Stall;
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
}

interface UseStallPaymentReturn {
  flowState: StallPaymentFlowState;
  error: string | null;
  txHash: string | null;
  initiatePayment: (amount: number) => Promise<void>;
  reset: () => void;
}

/**
 * Stall terminal payment. The guest taps their chip on the terminal: the first tap identifies the chip
 * owner, the second signs the PaymentAuth, and the wallet signed in on the terminal submits it. Funds
 * go from the guest's wallet to the stall operator; the server verifies the transfer before recording it.
 */
export function useStallPayment({ stall, onSuccess, onError }: UseStallPaymentOptions): UseStallPaymentReturn {
  const { pay } = useTapPayment();
  const [flowState, setFlowState] = useState<StallPaymentFlowState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const initiatePayment = useCallback(
    async (amount: number) => {
      if (!stall.operator_wallet) {
        setError("Stall operator has not registered their wallet");
        setFlowState("error");
        return;
      }

      setError(null);
      setTxHash(null);
      setFlowState("tapping");

      let paidTxHash: string | null = null;
      try {
        const result = await pay(
          {
            recipient: stall.operator_wallet as Address,
            token: stall.token_address as Address,
            amount: parseUnits(amount.toString(), TOKEN_DECIMALS.USDC),
          },
          step => setFlowState(step === "identifying" ? "tapping" : step),
        );
        paidTxHash = result.txHash;
        setTxHash(result.txHash);

        const response = await apiFetch("/api/events/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stallId: stall.id, txHash: result.txHash }),
        });
        const recorded = await response.json();
        if (!response.ok) {
          throw new Error(recorded.error || "Payment confirmed on-chain, but the stall record could not be saved.");
        }

        setFlowState("success");
        onSuccess?.(result.txHash);
      } catch (err) {
        console.error("Stall payment error:", err);
        const message = paidTxHash
          ? `Payment confirmed on-chain (${paidTxHash.slice(0, 10)}...), but the stall record could not be finalized.`
          : parseContractError(err) || (err instanceof Error ? err.message : "Payment failed");
        setError(message);
        setFlowState("error");
        onError?.(err instanceof Error ? err : new Error(message));
      }
    },
    [onError, onSuccess, pay, stall],
  );

  const reset = useCallback(() => {
    setFlowState("idle");
    setError(null);
    setTxHash(null);
  }, []);

  return { flowState, error, txHash, initiatePayment, reset };
}
