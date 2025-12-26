"use client";

import { BalanceEmptyState } from "./BalanceEmptyState";
import { BalanceItem } from "./BalanceItem";
import { BalanceListHeader } from "./BalanceListHeader";
import { useBalanceExpansion } from "./hooks/useBalanceExpansion";
import { AnimatePresence, motion } from "framer-motion";
import { type FriendBalance, type PaymentRequest } from "~~/lib/supabase";

interface BalancesLiveFeedProps {
  balances: FriendBalance[];
  loading: boolean;
  onFriendClick: (friend: FriendBalance) => void;
  onAddExpense: () => void;
  pendingRequests?: PaymentRequest[];
  onPaymentRequestClick?: (friend: FriendBalance) => void;
  processingFriendWallet?: string | null;
  successFriendWallet?: string | null;
}

/** Gradient background style for balance cards */
const cardBackground = {
  background: "linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%)",
};

/** Gradient overlay style for visual depth */
const gradientOverlay = {
  backgroundImage:
    "radial-gradient(at 20% 30%, rgba(242, 169, 0, 0.1) 0%, transparent 50%), radial-gradient(at 80% 70%, rgba(0, 224, 184, 0.08) 0%, transparent 50%)",
};

/**
 * Balance list component showing friend balances with payment request support.
 * Supports collapsed (preview) and expanded views.
 */
export const BalancesLiveFeed = ({
  balances,
  loading,
  onFriendClick,
  onAddExpense,
  pendingRequests = [],
  onPaymentRequestClick,
  processingFriendWallet,
  successFriendWallet,
}: BalancesLiveFeedProps) => {
  const { isExpanded, toggle, expand } = useBalanceExpansion();

  // Don't render while loading
  if (loading) return null;

  // Calculate balance counts
  const owedToYou = balances.filter(b => b.net_balance > 0).length;
  const youOwe = balances.filter(b => b.net_balance < 0).length;
  const hasBalances = balances.length > 0;

  // Render a balance item with all props
  const renderBalanceItem = (balance: FriendBalance, index: number, total: number) => (
    <BalanceItem
      key={balance.friend_wallet}
      balance={balance}
      isLast={index === total - 1}
      onFriendClick={onFriendClick}
      hasValidRequest={pendingRequests.some(req => req.payer.toLowerCase() === balance.friend_wallet.toLowerCase())}
      onPaymentRequestClick={onPaymentRequestClick}
      isProcessing={processingFriendWallet === balance.friend_wallet}
      isSuccess={successFriendWallet === balance.friend_wallet}
    />
  );

  return (
    <div className="mb-6">
      <BalanceListHeader
        owedToYou={owedToYou}
        youOwe={youOwe}
        totalBalances={balances.length}
        isExpanded={isExpanded}
        onToggleExpanded={toggle}
        onAddExpense={onAddExpense}
      />

      {/* Empty State */}
      {!hasBalances && <BalanceEmptyState />}

      {/* Preview (collapsed view - first 2 items) */}
      {!isExpanded && hasBalances && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 relative overflow-hidden border border-white/[0.05]"
          style={cardBackground}
        >
          <div className="absolute inset-0 opacity-30" style={gradientOverlay} />
          <div className="relative">
            {balances
              .slice(0, 2)
              .map((balance, index) => renderBalanceItem(balance, index, Math.min(2, balances.length)))}
            {balances.length > 2 && (
              <button
                onClick={expand}
                className="w-full pt-3 text-center text-xs text-base-content/40 hover:text-base-content/60 transition-colors"
              >
                +{balances.length - 2} more balances
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Expanded Full List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl p-4 relative overflow-hidden border border-white/[0.05]" style={cardBackground}>
              <div className="absolute inset-0 opacity-30" style={gradientOverlay} />
              <div className="relative max-h-[400px] overflow-y-auto scrollbar-hide">
                {balances.map((balance, index) => renderBalanceItem(balance, index, balances.length))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
