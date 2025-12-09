"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { AlertCircle, ArrowDown, ArrowUp, Clock, Loader2 } from "lucide-react";
import { usePaymentRequestsRealtime } from "~~/hooks/usePaymentRequestsRealtime";
import { type PaymentRequest as PaymentRequestType } from "~~/lib/supabase";

export default function RequestsPage() {
  const router = useRouter();
  const { authenticated } = usePrivy();
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">("incoming");

  const { requests, loading, error } = usePaymentRequestsRealtime(activeTab);

  const handleRequestClick = (request: PaymentRequestType) => {
    if (activeTab === "incoming" && request.status === "pending") {
      // Navigate to settlement page for incoming requests
      router.push(`/settle/${request.id}`);
    }
  };

  const formatAmount = (amount: string): string => {
    return parseFloat(amount).toFixed(2);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="px-2 py-1 bg-warning/10 text-warning rounded-full text-xs font-semibold flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case "completed":
        return <span className="px-2 py-1 bg-success/10 text-success rounded-full text-xs font-semibold">Paid</span>;
      case "expired":
        return (
          <span className="px-2 py-1 bg-base-300 text-base-content/50 rounded-full text-xs font-semibold">Expired</span>
        );
      default:
        return null;
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-[calc(100vh-160px)] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-base-content/50 text-lg mb-4">Please login to view requests</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] p-4">
      <div className="w-full max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Payment Requests</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-base-200 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("incoming")}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === "incoming"
                ? "bg-base-100 text-primary shadow-sm"
                : "text-base-content/60 hover:text-base-content"
            }`}
          >
            <ArrowDown className="w-4 h-4" />
            To Pay
          </button>
          <button
            onClick={() => setActiveTab("outgoing")}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === "outgoing"
                ? "bg-base-100 text-primary shadow-sm"
                : "text-base-content/60 hover:text-base-content"
            }`}
          >
            <ArrowUp className="w-4 h-4" />
            Requested
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <AlertCircle className="w-12 h-12 text-error mb-4" />
            <p className="text-error text-sm mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-content rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && requests.length === 0 && (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 rounded-full bg-base-300 flex items-center justify-center mx-auto mb-4">
              {activeTab === "incoming" ? (
                <ArrowDown className="w-8 h-8 text-base-content/30" />
              ) : (
                <ArrowUp className="w-8 h-8 text-base-content/30" />
              )}
            </div>
            <p className="text-base-content/50 font-medium">
              {activeTab === "incoming" ? "No requests to pay" : "No outgoing requests"}
            </p>
            <p className="text-sm text-base-content/40 mt-2">
              {activeTab === "incoming"
                ? "When friends request payment, they'll appear here"
                : "Create a request from the splits page"}
            </p>
          </div>
        )}

        {/* Requests List */}
        {!loading && !error && requests.length > 0 && (
          <div className="space-y-3">
            {requests.map(request => {
              const isIncoming = activeTab === "incoming";
              const otherUser = isIncoming ? request.recipient_user : request.payer_user;
              const isPending = request.status === "pending";
              const isClickable = isIncoming && isPending;

              return (
                <div
                  key={request.id}
                  className={`bg-base-300/30 rounded-xl p-3 border border-base-content/5 transition-all ${
                    isClickable
                      ? "cursor-pointer hover:bg-base-300/50 hover:border-primary/20 active:scale-[0.99]"
                      : "cursor-default opacity-75"
                  }`}
                  onClick={() => isClickable && handleRequestClick(request)}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    {otherUser?.twitter_profile_url ? (
                      <Image
                        src={otherUser.twitter_profile_url}
                        alt={otherUser.twitter_handle || otherUser.name}
                        width={44}
                        height={44}
                        className="w-11 h-11 rounded-full flex-shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {otherUser?.name?.charAt(0).toUpperCase() || "?"}
                        </span>
                      </div>
                    )}

                    {/* Name + Status */}
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-base-content truncate">
                        {isIncoming ? "From " : "To "}
                        {otherUser?.name || "Unknown"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {getStatusBadge(request.status)}
                        <span className="text-xs text-base-content/50">{formatDate(request.created_at)}</span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <p
                        className={`text-lg font-bold ${
                          isPending
                            ? "text-warning"
                            : request.status === "completed"
                              ? "text-success"
                              : "text-base-content"
                        }`}
                      >
                        ${formatAmount(request.amount)}
                      </p>
                      {request.memo && <p className="text-[10px] text-base-content/50 mt-0.5 uppercase">USDC</p>}
                    </div>
                  </div>

                  {/* Memo - Show as small text below if exists */}
                  {request.memo && <p className="text-xs text-base-content/60 mt-2 pl-14 truncate">{request.memo}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
