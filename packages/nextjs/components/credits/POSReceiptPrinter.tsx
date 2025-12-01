"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { CreditFlowState } from "~~/hooks/credits/useCreditPurchase";
import { getBlockExplorerTxLink } from "~~/utils/scaffold-eth";

interface ReceiptLine {
  id: string;
  text: string;
  type: "header" | "divider" | "status" | "detail" | "amount" | "success" | "error" | "balance" | "link";
  delay: number;
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
  lines.push({ id: "h1", text: "================================", type: "divider", delay: 0 });
  lines.push({ id: "h2", text: "SPLITHUB TERMINAL", type: "header", delay: 100 });
  lines.push({ id: "h3", text: "CREDIT PURCHASE", type: "header", delay: 200 });
  lines.push({ id: "h4", text: "================================", type: "divider", delay: 300 });
  lines.push({ id: "h5", text: `DATE: ${dateStr}  TIME: ${timeStr}`, type: "detail", delay: 400 });
  lines.push({ id: "h6", text: "--------------------------------", type: "divider", delay: 500 });

  // Transaction states
  if (flowState === "tapping") {
    lines.push({ id: "s1", text: "> WAITING FOR NFC TAP...", type: "status", delay: 600 });
  }

  if (flowState === "signing" || flowState === "submitting" || flowState === "confirming" || flowState === "success") {
    lines.push({ id: "s1", text: "> NFC CHIP DETECTED", type: "status", delay: 600 });
  }

  if (flowState === "signing") {
    lines.push({ id: "s2", text: "> SIGNING TRANSACTION...", type: "status", delay: 800 });
  }

  if (flowState === "submitting" || flowState === "confirming" || flowState === "success") {
    lines.push({ id: "s2", text: "> SIGNATURE VERIFIED", type: "status", delay: 800 });
    lines.push({ id: "s3", text: "> TRANSACTION SUBMITTED", type: "status", delay: 1000 });
  }

  if (flowState === "confirming" || flowState === "success") {
    lines.push({ id: "s4", text: "> TRANSACTION CONFIRMED", type: "status", delay: 1200 });
    lines.push({ id: "s5", text: "", type: "detail", delay: 1300 });
    lines.push({ id: "s6", text: `> SENDING ${amount}.00 USDC...`, type: "status", delay: 1400 });
  }

  if (flowState === "success") {
    lines.push({ id: "s7", text: "> USDC TRANSFERRED", type: "status", delay: 1600 });
    lines.push({ id: "s8", text: `> RECEIVING ${creditsNumber} CREDITS...`, type: "status", delay: 1800 });
    lines.push({ id: "s9", text: "> CREDITS RECEIVED", type: "success", delay: 2000 });
    lines.push({ id: "d1", text: "--------------------------------", type: "divider", delay: 2200 });
    if (truncatedHash && txExplorerUrl) {
      lines.push({ id: "a3", text: `TX: ${truncatedHash}`, type: "link", delay: 2300, href: txExplorerUrl });
    }
    lines.push({ id: "d2", text: "--------------------------------", type: "divider", delay: 2400 });
    lines.push({ id: "t1", text: `AMOUNT: $${amount}.00 USDC`, type: "amount", delay: 2500 });
    lines.push({ id: "t2", text: `CREDITS: +${creditsNumber} CR`, type: "success", delay: 2600 });
    if (balanceNumber !== null) {
      lines.push({ id: "t3", text: `NEW BALANCE: ${balanceNumber} CR`, type: "balance", delay: 2700 });
    }
    lines.push({ id: "d3", text: "================================", type: "divider", delay: 2800 });
    lines.push({ id: "f1", text: "** APPROVED **", type: "success", delay: 2900 });
    lines.push({ id: "f2", text: "================================", type: "divider", delay: 3000 });
    lines.push({ id: "f3", text: "*** THANK YOU ***", type: "header", delay: 3200 });
  }

  if (flowState === "error") {
    lines.push({ id: "e1", text: "> TRANSACTION FAILED", type: "error", delay: 600 });
    lines.push({ id: "d1", text: "--------------------------------", type: "divider", delay: 800 });
    lines.push({ id: "e2", text: `ERROR: ${error?.slice(0, 30) || "Unknown error"}`, type: "error", delay: 1000 });
    lines.push({ id: "d2", text: "================================", type: "divider", delay: 1200 });
    lines.push({ id: "e3", text: "** DECLINED **", type: "error", delay: 1300 });
    lines.push({ id: "d3", text: "================================", type: "divider", delay: 1400 });
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
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [allLines, setAllLines] = useState<ReceiptLine[]>([]);

  // Generate lines based on current state
  useEffect(() => {
    const lines = generateReceiptLines(flowState, txHash, chainId, amount, creditsMinted, newBalance, error);
    setAllLines(lines);
  }, [flowState, txHash, chainId, amount, creditsMinted, newBalance, error]);

  // Animate lines appearing
  useEffect(() => {
    setVisibleLines([]);
    const timers: NodeJS.Timeout[] = [];

    allLines.forEach(line => {
      const timer = setTimeout(() => {
        setVisibleLines(prev => [...prev, line.id]);
      }, line.delay);
      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, [allLines]);

  const isSuccess = flowState === "success";
  const isError = flowState === "error";

  return (
    <div className="pos-receipt-printer">
      {/* Receipt paper container */}
      <div className="pos-receipt-paper">
        {/* Serrated edge */}
        <div className="pos-receipt-serrated" />

        {/* Receipt content */}
        <div className="pos-receipt-content">
          {allLines.map(line => (
            <div
              key={line.id}
              className={`pos-receipt-line ${visibleLines.includes(line.id) ? "visible" : ""} pos-receipt-${line.type}`}
            >
              {line.type === "link" && line.href ? (
                <a href={line.href} target="_blank" rel="noopener noreferrer" className="pos-receipt-hash">
                  {line.text}
                </a>
              ) : (
                line.text
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      {(isSuccess || isError) && (
        <div className="pos-receipt-actions">
          {isSuccess && onDismiss && (
            <button onClick={onDismiss} className="pos-receipt-btn pos-receipt-btn-success">
              <Check className="w-4 h-4" />
              <span>DONE</span>
            </button>
          )}
          {isError && onRetry && (
            <button onClick={onRetry} className="pos-receipt-btn pos-receipt-btn-error">
              <X className="w-4 h-4" />
              <span>RETRY</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
