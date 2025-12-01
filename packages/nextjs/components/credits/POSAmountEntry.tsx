"use client";

import { Nfc } from "lucide-react";

interface POSAmountEntryProps {
  amount: number;
  onAmountChange: (amount: number) => void;
  onSubmit: () => void;
  disabled: boolean;
}

const PRESET_AMOUNTS = [10, 25, 50, 100];

export function POSAmountEntry({ amount, onAmountChange, onSubmit, disabled }: POSAmountEntryProps) {
  const creditsToReceive = amount * 10;

  return (
    <div className="pos-amount-entry">
      {/* Amount Display */}
      <div className="pos-amount-display">
        <div className="pos-amount-label">AMOUNT</div>
        <div className="pos-amount-value">
          <span className="pos-currency">$</span>
          <span className="pos-amount-number">{amount}</span>
          <span className="pos-amount-decimal">.00</span>
        </div>
        <div className="pos-amount-token">USDC</div>
      </div>

      {/* Preset Amount Keypad */}
      <div className="pos-keypad">
        {PRESET_AMOUNTS.map(preset => (
          <button
            key={preset}
            onClick={() => onAmountChange(preset)}
            className={`pos-keypad-btn ${amount === preset ? "pos-keypad-btn-active" : ""}`}
            disabled={disabled}
          >
            ${preset}
          </button>
        ))}
      </div>

      {/* Credits Preview */}
      <div className="pos-credits-preview">
        <div className="pos-preview-row">
          <span className="pos-preview-label">CREDITS (10x)</span>
          <span className="pos-preview-value">+{creditsToReceive}</span>
        </div>
        <div className="pos-preview-row">
          <span className="pos-preview-label">NETWORK FEE</span>
          <span className="pos-preview-free">FREE</span>
        </div>
      </div>

      {/* Tap to Pay Button */}
      <div className="pos-tap-section">
        <button onClick={onSubmit} disabled={disabled} className="pos-tap-pay-btn" aria-label="Tap to pay">
          <div className="pos-tap-icon-wrapper">
            <Nfc className="w-8 h-8" strokeWidth={1.5} />
          </div>
          <span className="pos-tap-text">TAP TO PAY</span>
        </button>
      </div>
    </div>
  );
}
