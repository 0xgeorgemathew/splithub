import { supabase } from "~~/lib/supabase";

export interface SpendSignals {
  /** Total USD of pending payment requests for this user */
  pendingRequestsUsd: string;
  /** Median daily spend over the last 7 days */
  sevenDayMedianSpendUsd: string;
  /** Largest single payment expected in near term */
  maxSingleExpectedSpendUsd: string;
}

/**
 * Compute spending signals from SplitHub's payment data.
 * Used by the planner to determine reserve requirements.
 */
export async function getSpendSignals(userWallet: string): Promise<SpendSignals> {
  const wallet = userWallet.toLowerCase();

  // 1. Pending payment requests where this user is the payer
  const { data: pendingRequests, error: reqError } = await supabase
    .from("payment_requests")
    .select("amount")
    .eq("payer", wallet)
    .eq("status", "pending");

  if (reqError) {
    throw new Error(`Failed to fetch pending requests: ${reqError.message}`);
  }

  const pendingTotal = (pendingRequests ?? []).reduce((sum, r) => sum + parseFloat(r.amount), 0);
  const maxPending = (pendingRequests ?? []).reduce((max, r) => Math.max(max, parseFloat(r.amount)), 0);

  // 2. Recent settlements for spend pattern (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: recentSettlements, error: settleError } = await supabase
    .from("settlements")
    .select("amount, created_at")
    .eq("payer_wallet", wallet)
    .eq("status", "completed")
    .gte("created_at", sevenDaysAgo);

  if (settleError) {
    throw new Error(`Failed to fetch recent settlements: ${settleError.message}`);
  }

  const settlementAmounts = (recentSettlements ?? []).map(s => s.amount);
  const medianSpend = computeMedian(settlementAmounts);
  const maxSpend = settlementAmounts.length > 0 ? Math.max(...settlementAmounts) : 0;

  return {
    pendingRequestsUsd: pendingTotal.toFixed(2),
    sevenDayMedianSpendUsd: medianSpend.toFixed(2),
    maxSingleExpectedSpendUsd: Math.max(maxPending, maxSpend).toFixed(2),
  };
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
