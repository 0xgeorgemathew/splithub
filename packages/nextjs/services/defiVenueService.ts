export interface DefiVenueCandidate {
  id: "aave" | "morpho_blue" | "compound_v3" | "balancer";
  label: string;
  mockedApyPct: string;
  mockedOutlook: "good" | "bad";
  liquidityProfile: "high" | "medium" | "low";
  executionStatus: "supported_now" | "mocked_only";
  notes: string;
}

export function getMockDefiVenueCandidates(): DefiVenueCandidate[] {
  return [
    {
      id: "aave",
      label: "Aave",
      mockedApyPct: "4.20",
      mockedOutlook: "good",
      liquidityProfile: "high",
      executionStatus: "supported_now",
      notes:
        "Preferred reserve venue for this prototype. It has the best mocked yield and the cleanest JIT liquidity path.",
    },
    {
      id: "morpho_blue",
      label: "Morpho Blue",
      mockedApyPct: "0.35",
      mockedOutlook: "bad",
      liquidityProfile: "medium",
      executionStatus: "mocked_only",
      notes: "Mocked as unattractive for now because the effective yield is too low for idle cash.",
    },
    {
      id: "compound_v3",
      label: "Compound V3",
      mockedApyPct: "0.18",
      mockedOutlook: "bad",
      liquidityProfile: "medium",
      executionStatus: "mocked_only",
      notes: "Mocked as unattractive because the yield is lower than Aave and does not justify moving funds there.",
    },
    {
      id: "balancer",
      label: "Balancer",
      mockedApyPct: "-0.80",
      mockedOutlook: "bad",
      liquidityProfile: "low",
      executionStatus: "mocked_only",
      notes: "Mocked as unattractive because the strategy is assumed to be net negative after fees and slippage.",
    },
  ];
}
