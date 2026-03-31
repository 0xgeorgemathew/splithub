export type JitFundingSource = "chip_balance" | "agent_liquid" | "aave_withdraw" | "insufficient_backing";

export interface JitUiCopy {
  title: string;
  detail: string;
  badges: string[];
}

export function getJitUiCopy(fundingSource: JitFundingSource | null): JitUiCopy | null {
  if (!fundingSource) {
    return null;
  }

  if (fundingSource === "chip_balance") {
    return {
      title: "No top-up needed",
      detail: "The chip wallet already covers this payment.",
      badges: ["Ready", "Aave untouched"],
    };
  }

  if (fundingSource === "agent_liquid") {
    return {
      title: "Using Vincent reserve",
      detail: "Liquid funds cover this payment without withdrawing from Aave.",
      badges: ["Fast path", "Liquid reserve"],
    };
  }

  if (fundingSource === "aave_withdraw") {
    return {
      title: "AI picked Aave",
      detail: "Withdrawing the exact shortfall, then funding the chip wallet.",
      badges: ["Best yield", "Deep liquidity", "JIT top-up"],
    };
  }

  return {
    title: "Funding unavailable",
    detail: "This payment exceeds the current safe backing.",
    badges: ["No safe route"],
  };
}
