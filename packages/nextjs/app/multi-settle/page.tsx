"use client";

import { useState } from "react";
import { Coins, Fuel, Plus, Trash2, User, Users } from "lucide-react";
import { isAddress } from "viem";
import { MultiSettleFlow } from "~~/components/settle";

// Demo/default values - in production these would come from a split creation flow
const DEFAULT_RECIPIENT = "0x09a6f8C0194246c365bB42122E872626460F8a71" as const;
const DEFAULT_TOKEN = "0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a" as const;

interface AmountSlot {
  id: string;
  amount: string;
}

export default function MultiSettlePage() {
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [recipient, setRecipient] = useState<string>(DEFAULT_RECIPIENT);
  const [token, setToken] = useState<string>(DEFAULT_TOKEN);
  const [memo, setMemo] = useState("");
  const [slots, setSlots] = useState<AmountSlot[]>([{ id: "1", amount: "" }]);

  const addSlot = () => {
    setSlots(prev => [...prev, { id: Date.now().toString(), amount: "" }]);
  };

  const removeSlot = (id: string) => {
    if (slots.length > 1) {
      setSlots(prev => prev.filter(s => s.id !== id));
    }
  };

  const updateSlot = (id: string, amount: string) => {
    setSlots(prev => prev.map(s => (s.id === id ? { ...s, amount } : s)));
  };

  const isValidConfig = () => {
    if (!isAddress(recipient) || !isAddress(token)) return false;
    return slots.every(s => s.amount && parseFloat(s.amount) > 0);
  };

  const startMultiSettle = () => {
    if (isValidConfig()) {
      setIsConfiguring(false);
    }
  };

  const handleSuccess = (txHash: string) => {
    console.log("Batch payment complete:", txHash);
    // Could redirect or show success state
  };

  // Calculate total amount for display
  const totalAmount = slots.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

  if (!isConfiguring) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-base-200 p-4 pb-24">
        <div className="w-full max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setIsConfiguring(true)} className="text-sm text-primary hover:underline">
              ← Back to config
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 rounded-full">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Multi-Settle</span>
            </div>
          </div>

          <MultiSettleFlow
            recipient={recipient as `0x${string}`}
            token={token as `0x${string}`}
            amounts={slots.map(s => s.amount)}
            memo={memo || undefined}
            onSuccess={handleSuccess}
          />
        </div>
      </div>
    );
  }

  // Configuration UI
  return (
    <div className="min-h-[calc(100vh-64px)] bg-base-200 p-4 pb-24">
      <div className="w-full max-w-md mx-auto flex flex-col items-center pt-6">
        {/* Info Pills - matching settle page style */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-base-100 border border-base-300 rounded-full">
            <User className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-base-content">
              {recipient ? `${recipient.slice(0, 6)}...${recipient.slice(-4)}` : "Recipient"}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-base-100 border border-primary/50 rounded-full">
            <Coins className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-base-content">Token</span>
            <span className="w-1.5 h-1.5 bg-success rounded-full" />
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-base-100 border border-base-300 rounded-full">
            <Fuel className="w-3.5 h-3.5 text-success" />
            <span className="text-xs font-medium text-success">Gasless</span>
          </div>
        </div>

        {/* Total Amount Display - large like settle page */}
        <div className="text-center mb-6">
          <p className="text-5xl font-bold text-base-content mb-1">{totalAmount || 0}</p>
          <p className="text-base-content/50 text-sm">
            total from {slots.length} {slots.length === 1 ? "participant" : "participants"}
          </p>
        </div>

        {/* Batch Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-6">
          <Users className="w-8 h-8 text-primary" />
        </div>

        {/* Configuration Cards */}
        <div className="w-full space-y-3">
          {/* Recipient */}
          <div className="bg-base-100 rounded-xl p-4">
            <label className="text-xs font-medium text-base-content/70 mb-2 block">Recipient Address</label>
            <input
              type="text"
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              placeholder="0x..."
              className="w-full bg-base-200 rounded-lg px-3 py-2 text-sm font-mono text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Token */}
          <div className="bg-base-100 rounded-xl p-4">
            <label className="text-xs font-medium text-base-content/70 mb-2 block">Token Address</label>
            <input
              type="text"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="0x..."
              className="w-full bg-base-200 rounded-lg px-3 py-2 text-sm font-mono text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Memo */}
          <div className="bg-base-100 rounded-xl p-4">
            <label className="text-xs font-medium text-base-content/70 mb-2 block">Memo (optional)</label>
            <input
              type="text"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="Dinner split..."
              className="w-full bg-base-200 rounded-lg px-3 py-2 text-sm text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Amount Slots */}
          <div className="bg-base-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-base-content/70">Payment Amounts</label>
              <button onClick={addSlot} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80">
                <Plus className="w-3.5 h-3.5" />
                Add Slot
              </button>
            </div>

            <p className="text-xs text-base-content/50 mb-3">Payers are auto-detected when they tap their NFC chip.</p>

            <div className="space-y-2">
              {slots.map((slot, idx) => (
                <div key={slot.id} className="flex gap-2 items-center">
                  <div className="w-8 h-8 rounded-full bg-base-200 flex items-center justify-center text-xs font-bold text-base-content/70">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={slot.amount}
                      onChange={e => updateSlot(slot.id, e.target.value)}
                      placeholder="Amount"
                      className="w-full bg-base-200 rounded-lg px-3 py-2 text-sm text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  {slots.length > 1 && (
                    <button onClick={() => removeSlot(slot.id)} className="p-2 text-base-content/50 hover:text-error">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Start Button - rounded-full like settle page */}
        <button
          onClick={startMultiSettle}
          disabled={!isValidConfig()}
          className="mt-6 px-8 py-3 bg-primary hover:bg-primary/90 text-primary-content font-semibold rounded-full transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          Start Multi-Settle
        </button>
      </div>
    </div>
  );
}
