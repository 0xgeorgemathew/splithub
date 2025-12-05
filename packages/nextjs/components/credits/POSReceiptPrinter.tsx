"use client";

import { useMemo } from "react";
import { AnimatePresence, Variants, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { CreditFlowState } from "~~/hooks/credits/useCreditPurchase";
import { getBlockExplorerTxLink } from "~~/utils/scaffold-eth";

// Paper-like spring physics for smooth unrolling effect
const paperPhysics = {
  type: "spring" as const,
  stiffness: 120,
  damping: 14,
};

// Container variants for staggered children
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

// Line variants for each receipt line
const lineVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -3,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.15,
      ease: "easeOut",
    },
  },
};

// Button variants with physics
const buttonVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: paperPhysics,
  },
};

interface ReceiptLine {
  id: string;
  text: string;
  type: "header" | "divider" | "status" | "detail" | "amount" | "success" | "error" | "balance" | "link";
  href?: string;
}

interface POSReceiptPrinterProps {
  flowState: CreditFlowState;
  txHash: string | null;
  chainId: number;
  creditsMinted: string | null;
  newBalance: string | null;
  amount: number;
  error: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

function generateReceiptLines(
  flowState: CreditFlowState,
  txHash: string | null,
  chainId: number,
  amount: number,
  creditsMinted: string | null,
  newBalance: string | null,
  error: string | null,
): ReceiptLine[] {
  const lines: ReceiptLine[] = [];
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const truncatedHash = txHash ? `${txHash.slice(0, 10)}...${txHash.slice(-6)}` : null;
  const txExplorerUrl = txHash ? getBlockExplorerTxLink(chainId, txHash) : null;
  const creditsNumber = creditsMinted ? Number(BigInt(creditsMinted) / BigInt(10 ** 18)) : amount * 10;
  const balanceNumber = newBalance ? Number(BigInt(newBalance) / BigInt(10 ** 18)) : null;

  // Header
  lines.push({ id: "h1", text: "================================", type: "divider" });
  lines.push({ id: "h2", text: "SPLITHUB TERMINAL", type: "header" });
  lines.push({ id: "h3", text: "CREDIT PURCHASE", type: "header" });
  lines.push({ id: "h4", text: "================================", type: "divider" });
  lines.push({ id: "h5", text: `DATE: ${dateStr}  TIME: ${timeStr}`, type: "detail" });
  lines.push({ id: "h6", text: "--------------------------------", type: "divider" });

  // Transaction states - progressive display based on flow
  if (flowState === "tapping") {
    lines.push({ id: "s1", text: "> WAITING FOR NFC TAP...", type: "status" });
  }

  if (flowState === "signing" || flowState === "submitting" || flowState === "confirming" || flowState === "success") {
    lines.push({ id: "s1", text: "> NFC CHIP DETECTED", type: "status" });
  }

  if (flowState === "signing") {
    lines.push({ id: "s2", text: "> SIGNING TRANSACTION...", type: "status" });
  }

  if (flowState === "submitting" || flowState === "confirming" || flowState === "success") {
    lines.push({ id: "s2", text: "> SIGNATURE VERIFIED", type: "status" });
    lines.push({ id: "s3", text: "> TRANSACTION SUBMITTED", type: "status" });
  }

  if (flowState === "confirming" || flowState === "success") {
    lines.push({ id: "s4", text: "> TRANSACTION CONFIRMED", type: "status" });
    lines.push({ id: "s5", text: "", type: "detail" });
    lines.push({ id: "s6", text: `> SENDING ${amount}.00 USDC...`, type: "status" });
  }

  if (flowState === "success") {
    lines.push({ id: "s7", text: "> USDC TRANSFERRED", type: "status" });
    lines.push({ id: "s8", text: `> RECEIVING ${creditsNumber} CREDITS...`, type: "status" });
    lines.push({ id: "s9", text: "> CREDITS RECEIVED", type: "success" });
    lines.push({ id: "d1", text: "--------------------------------", type: "divider" });
    if (truncatedHash && txExplorerUrl) {
      lines.push({ id: "a3", text: `TX: ${truncatedHash}`, type: "link", href: txExplorerUrl });
    }
    lines.push({ id: "d2", text: "--------------------------------", type: "divider" });
    lines.push({ id: "t1", text: `AMOUNT: $${amount}.00 USDC`, type: "amount" });
    lines.push({ id: "t2", text: `CREDITS: +${creditsNumber} CR`, type: "success" });
    if (balanceNumber !== null) {
      lines.push({ id: "t3", text: `NEW BALANCE: ${balanceNumber} CR`, type: "balance" });
    }
    lines.push({ id: "d3", text: "================================", type: "divider" });
    lines.push({ id: "f1", text: "** APPROVED **", type: "success" });
    lines.push({ id: "d4", text: "================================", type: "divider" });
    lines.push({ id: "f2", text: "*** THANK YOU ***", type: "header" });
  }

  if (flowState === "error") {
    lines.push({ id: "e1", text: "> TRANSACTION FAILED", type: "error" });
    lines.push({ id: "d1", text: "--------------------------------", type: "divider" });
    lines.push({ id: "e2", text: `ERROR: ${error?.slice(0, 30) || "Unknown error"}`, type: "error" });
    lines.push({ id: "d2", text: "================================", type: "divider" });
    lines.push({ id: "e3", text: "** DECLINED **", type: "error" });
    lines.push({ id: "d3", text: "================================", type: "divider" });
  }

  return lines;
}

export function POSReceiptPrinter({
  flowState,
  txHash,
  chainId,
  creditsMinted,
  newBalance,
  amount,
  error,
  onRetry,
  onDismiss,
}: POSReceiptPrinterProps) {
  // Generate lines based on current flow state
  const allLines = useMemo(
    () => generateReceiptLines(flowState, txHash, chainId, amount, creditsMinted, newBalance, error),
    [flowState, txHash, chainId, amount, creditsMinted, newBalance, error],
  );

  const isSuccess = flowState === "success";
  const isError = flowState === "error";
  const showActions = isSuccess || isError;

  return (
    <div className="pos-receipt-printer">
      {/* Receipt paper container - animates height */}
      <motion.div
        className="pos-receipt-paper"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        transition={paperPhysics}
      >
        {/* Serrated edge */}
        <div className="pos-receipt-serrated" />

        {/* Receipt slot shadow - paper emerging from dark slot */}
        <div
          className="pos-receipt-slot-shadow"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "8px",
            background: "linear-gradient(to bottom, rgba(0, 0, 0, 0.5) 0%, transparent 100%)",
            pointerEvents: "none",
            zIndex: 5,
          }}
        />

        {/* Receipt content - staggered line appearance */}
        <motion.div
          className="pos-receipt-content"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          key={flowState} // Re-trigger animation when flow state changes
        >
          {allLines.map(line => (
            <motion.div
              key={line.id}
              className={`pos-receipt-line visible pos-receipt-${line.type}`}
              variants={lineVariants}
            >
              {line.type === "link" && line.href ? (
                <a href={line.href} target="_blank" rel="noopener noreferrer" className="pos-receipt-hash">
                  {line.text}
                </a>
              ) : (
                line.text
              )}
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Action buttons with AnimatePresence */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            className="pos-receipt-actions"
            variants={buttonVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {isSuccess && onDismiss && (
              <motion.button
                onClick={onDismiss}
                className="pos-receipt-btn pos-receipt-btn-success"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95, y: 2 }}
              >
                <Check className="w-4 h-4" />
                <span>DONE</span>
              </motion.button>
            )}
            {isError && onRetry && (
              <motion.button
                onClick={onRetry}
                className="pos-receipt-btn pos-receipt-btn-error"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95, y: 2 }}
              >
                <X className="w-4 h-4" />
                <span>RETRY</span>
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
