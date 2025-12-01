"use client";

import { Check, ExternalLink, Loader2, X } from "lucide-react";
import { CreditFlowState } from "~~/hooks/credits/useCreditPurchase";

interface POSTransactionDisplayProps {
  flowState: CreditFlowState;
  txHash: string | null;
  confirmations: number;
  targetConfirmations: number;
  blockNumber: string | null;
  networkName: string;
  creditsMinted: string | null;
  amount: number;
  error: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

function getStatusText(flowState: CreditFlowState): string {
  switch (flowState) {
    case "tapping":
      return "WAITING FOR TAP...";
    case "signing":
      return "SIGNING...";
    case "submitting":
      return "TX INITIATED";
    case "confirming":
      return "CONFIRMING";
    case "success":
      return "APPROVED";
    case "error":
      return "FAILED";
    default:
      return "READY";
  }
}

function getProgressPercent(flowState: CreditFlowState, confirmations: number, target: number): number {
  switch (flowState) {
    case "tapping":
      return 10;
    case "signing":
      return 25;
    case "submitting":
      return 40;
    case "confirming":
      return 40 + (confirmations / target) * 50;
    case "success":
      return 100;
    default:
      return 0;
  }
}

export function POSTransactionDisplay({
  flowState,
  txHash,
  confirmations,
  targetConfirmations,
  blockNumber,
  networkName,
  creditsMinted,
  amount,
  error,
  onRetry,
  onDismiss,
}: POSTransactionDisplayProps) {
  const isSuccess = flowState === "success";
  const isError = flowState === "error";

  const statusText = getStatusText(flowState);
  const progressPercent = getProgressPercent(flowState, confirmations, targetConfirmations);

  const truncatedHash = txHash ? `${txHash.slice(0, 6)}...${txHash.slice(-4)}` : null;
  const explorerUrl = txHash ? `https://sepolia.basescan.org/tx/${txHash}` : null;

  // Calculate credits from creditsMinted (which is in wei with 18 decimals)
  const creditsNumber = creditsMinted ? Number(BigInt(creditsMinted) / BigInt(10 ** 18)) : amount * 10;

  return (
    <div className="pos-tx-display">
      {/* Status Header */}
      <div className={`pos-tx-status-header ${isSuccess ? "pos-tx-success" : isError ? "pos-tx-error" : ""}`}>
        <div className="pos-tx-status-icon">
          {isSuccess ? (
            <Check className="w-6 h-6" strokeWidth={3} />
          ) : isError ? (
            <X className="w-6 h-6" strokeWidth={3} />
          ) : (
            <Loader2 className="w-6 h-6 animate-spin" />
          )}
        </div>
        <div className="pos-tx-status-text">{statusText}</div>
      </div>

      {/* Progress Bar */}
      {!isError && (
        <div className="pos-tx-progress-container">
          <div className="pos-tx-progress-bar">
            <div
              className={`pos-tx-progress-fill ${isSuccess ? "pos-tx-progress-success" : ""}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="pos-tx-progress-percent">{Math.round(progressPercent)}%</div>
        </div>
      )}

      {/* Transaction Details */}
      <div className="pos-tx-details">
        {/* TX Hash */}
        {txHash && (
          <div className="pos-tx-row">
            <span className="pos-tx-label">TX HASH</span>
            <a href={explorerUrl!} target="_blank" rel="noopener noreferrer" className="pos-tx-hash-link">
              {truncatedHash}
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
        )}

        {/* Network */}
        <div className="pos-tx-row">
          <span className="pos-tx-label">NETWORK</span>
          <span className="pos-tx-value">{networkName}</span>
        </div>

        {/* Gas */}
        <div className="pos-tx-row">
          <span className="pos-tx-label">GAS</span>
          <span className="pos-tx-value-free">FREE (Sponsored)</span>
        </div>

        {/* Confirmations */}
        {(flowState === "confirming" || isSuccess) && (
          <div className="pos-tx-row">
            <span className="pos-tx-label">CONFIRMATIONS</span>
            <div className="pos-tx-confirmations">
              <span className="pos-tx-conf-count">
                {confirmations}/{targetConfirmations}
              </span>
              <div className="pos-tx-conf-dots">
                {Array.from({ length: targetConfirmations }).map((_, i) => (
                  <div key={i} className={`pos-tx-conf-dot ${i < confirmations ? "pos-tx-conf-dot-filled" : ""}`} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Block Number */}
        {blockNumber && (
          <div className="pos-tx-row">
            <span className="pos-tx-label">BLOCK</span>
            <span className="pos-tx-value">#{blockNumber}</span>
          </div>
        )}
      </div>

      {/* Amount Summary (shown on success) */}
      {isSuccess && (
        <div className="pos-tx-summary">
          <div className="pos-tx-summary-row">
            <span className="pos-tx-summary-label">AMOUNT</span>
            <span className="pos-tx-summary-value">${amount}.00 USDC</span>
          </div>
          <div className="pos-tx-summary-row pos-tx-summary-credits">
            <span className="pos-tx-summary-label">CREDITS</span>
            <span className="pos-tx-summary-value">+{creditsNumber} CR</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {isError && error && (
        <div className="pos-tx-error-box">
          <div className="pos-tx-error-message">{error}</div>
          {onRetry && (
            <button onClick={onRetry} className="pos-tx-retry-btn">
              RETRY
            </button>
          )}
        </div>
      )}

      {/* Success Footer */}
      {isSuccess && (
        <div className="pos-tx-footer">
          <div className="pos-tx-thank-you">*** THANK YOU ***</div>
          {onDismiss && (
            <button onClick={onDismiss} className="pos-tx-done-btn">
              DONE
            </button>
          )}
        </div>
      )}
    </div>
  );
}
