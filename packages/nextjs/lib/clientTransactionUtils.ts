type CircleAutoSplitPayload = {
  userWallet: `0x${string}`;
  amount: string;
  tokenAddress: `0x${string}`;
  decimals?: number;
  description?: string;
};

export async function triggerCircleAutoSplit(payload: CircleAutoSplitPayload) {
  try {
    const response = await fetch("/api/circles/auto-split", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || "Failed to run circle auto-split");
    }

    return await response.json();
  } catch (error) {
    console.error("Circle auto-split side effect failed:", error);
    return null;
  }
}

export function dispatchClientRefreshEvents({
  balances = true,
  paymentRequests = false,
}: {
  balances?: boolean;
  paymentRequests?: boolean;
} = {}) {
  if (typeof window === "undefined") {
    return;
  }

  if (balances) {
    window.dispatchEvent(new Event("refreshBalances"));
  }

  if (paymentRequests) {
    window.dispatchEvent(new Event("refreshPaymentRequests"));
  }
}
