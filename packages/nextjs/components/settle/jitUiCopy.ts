import { SCAN_SOURCES, type ScanSourceId } from "~~/services/defiVenueService";

export type JitFundingSource = "chip_balance" | "agent_liquid" | "aave_withdraw" | "insufficient_backing";

export type SourceCardStatus = "queued" | "checking" | "passed" | "selected" | "rejected" | "skipped";

export interface SourceCardData {
  id: ScanSourceId;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  status: SourceCardStatus;
  amount: string | null;
  apy: string | null;
  reason: string | null;
}

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
      detail: "Chip balance already covers the payment.",
      badges: ["Tap ready", "Route clear"],
    };
  }

  if (fundingSource === "agent_liquid") {
    return {
      title: "Using Vincent reserve",
      detail: "Liquid reserve can cover this payment directly.",
      badges: ["Fast path", "Reserve ready"],
    };
  }

  if (fundingSource === "aave_withdraw") {
    return {
      title: "Aave selected",
      detail: "Best route for reserve-backed payment readiness.",
      badges: ["Best yield", "Fast withdraw", "Reserve ready"],
    };
  }

  return {
    title: "Funding unavailable",
    detail: "This payment exceeds the current safe backing.",
    badges: ["No safe route"],
  };
}

/** Build initial source card data for the scanning grid */
export function buildInitialSourceCards(): SourceCardData[] {
  return SCAN_SOURCES.map(s => ({
    id: s.id,
    label: s.label,
    color: s.color,
    bgColor: s.bgColor,
    borderColor: s.borderColor,
    status: "queued",
    amount: null,
    apy: null,
    reason: null,
  }));
}

/** Resolve source cards based on the funding source result and available balance data */
export function resolveSourceCards(
  cards: SourceCardData[],
  fundingSource: JitFundingSource,
  options: {
    chipBalance?: string | null;
    agentLiquid?: string | null;
    aaveReserve?: string | null;
    aaveApy?: string | null;
    morphoApy?: string | null;
  },
): SourceCardData[] {
  return cards.map(card => {
    const isSelected =
      (fundingSource === "chip_balance" && card.id === "chip_balance") ||
      (fundingSource === "agent_liquid" && card.id === "agent_liquid") ||
      (fundingSource === "aave_withdraw" && card.id === "aave");

    const wasChecked =
      card.id === "chip_balance" || card.id === "agent_liquid" || card.id === "aave" || card.id === "morpho_blue";

    if (isSelected) {
      let amount = "";
      let apy: string | null = null;
      if (card.id === "chip_balance") amount = options.chipBalance ?? "—";
      if (card.id === "agent_liquid") amount = options.agentLiquid ?? "—";
      if (card.id === "aave") {
        amount = options.aaveReserve ?? "—";
        apy = options.aaveApy ?? "4.20%";
      }
      return { ...card, status: "selected", amount, apy, reason: null };
    }

    if (wasChecked) {
      let amount: string | null = null;
      let reason: string | null = null;
      let apy: string | null = null;

      if (card.id === "chip_balance") {
        amount = options.chipBalance ?? null;
        reason = amount ? "Insufficient" : null;
      } else if (card.id === "agent_liquid") {
        amount = options.agentLiquid ?? null;
        reason = !amount || amount === "$0.00" ? "N/A" : null;
      } else if (card.id === "aave") {
        amount = options.aaveReserve ?? null;
        apy = options.aaveApy ?? "4.20%";
      } else if (card.id === "morpho_blue") {
        apy = options.morphoApy ?? "0.35%";
        reason = "0.35% — too low";
      }

      return { ...card, status: "rejected", amount, apy, reason };
    }

    return { ...card, status: "skipped" };
  });
}
