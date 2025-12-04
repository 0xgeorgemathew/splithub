"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { FriendSelector } from "~~/components/expense/FriendSelector";
import { Friend } from "~~/components/expense/hooks/useExpenseForm";

export default function CreateRequestPage() {
  const router = useRouter();
  const { user } = usePrivy();
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestUrl, setRequestUrl] = useState<string | null>(null);

  const requesterWallet = user?.wallet?.address;
  const requesterTwitter = user?.twitter?.username;

  const handleCreateRequest = async () => {
    if (!selectedFriend || !amount || !requesterWallet) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/payment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payer: selectedFriend.address,
          recipient: requesterWallet,
          token: "0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a", // USDT Base Sepolia
          amount,
          memo,
          payerTwitter: selectedFriend.twitterHandle,
          requesterTwitter,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create request");
      }

      const fullUrl = `${window.location.origin}${data.settleUrl}`;
      setRequestUrl(fullUrl);
    } catch (error) {
      console.error("Error creating request:", error);
      alert("Failed to create payment request");
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (requestUrl) {
      navigator.clipboard.writeText(requestUrl);
      alert("Link copied to clipboard!");
    }
  };

  if (requestUrl) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Request Created!</h1>
          <p className="text-base-content/60 mb-6">Share this link with {selectedFriend?.name}</p>

          <div className="bg-base-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-mono break-all">{requestUrl}</p>
          </div>

          <div className="flex gap-3">
            <button onClick={handleCopyLink} className="btn btn-primary flex-1">
              Copy Link
            </button>
            <button onClick={() => router.push("/")} className="btn btn-ghost flex-1">
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] p-4">
      <div className="w-full max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">Request Payment</h1>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body space-y-4">
            {/* Amount Input */}
            <div>
              <label className="label">
                <span className="label-text font-semibold">Amount (USDC)</span>
              </label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="input input-bordered w-full"
                step="0.01"
                min="0"
              />
            </div>

            {/* Memo */}
            <div>
              <label className="label">
                <span className="label-text font-semibold">Memo (optional)</span>
              </label>
              <input
                type="text"
                value={memo}
                onChange={e => setMemo(e.target.value)}
                placeholder="What's this for?"
                className="input input-bordered w-full"
              />
            </div>

            {/* Friend Selector */}
            <div>
              <label className="label">
                <span className="label-text font-semibold">Request from</span>
              </label>
              {selectedFriend ? (
                <div className="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
                  {selectedFriend.twitterProfileUrl ? (
                    <img
                      src={selectedFriend.twitterProfileUrl}
                      alt={selectedFriend.name}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="font-bold text-primary">{selectedFriend.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{selectedFriend.name}</p>
                    {selectedFriend.twitterHandle && (
                      <p className="text-sm text-base-content/60">@{selectedFriend.twitterHandle}</p>
                    )}
                  </div>
                  <button onClick={() => setSelectedFriend(null)} className="btn btn-ghost btn-sm">
                    Change
                  </button>
                </div>
              ) : (
                <button onClick={() => setIsSelectorOpen(true)} className="btn btn-outline w-full">
                  Select Friend
                </button>
              )}
            </div>

            {/* Create Button */}
            <button
              onClick={handleCreateRequest}
              disabled={!selectedFriend || !amount || isSubmitting}
              className="btn btn-primary w-full gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Create Request
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Friend Selector Modal */}
      <FriendSelector
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        onSelectFriend={friend => {
          setSelectedFriend(friend);
          setIsSelectorOpen(false);
        }}
        selectedFriends={selectedFriend ? [selectedFriend] : []}
      />
    </div>
  );
}
