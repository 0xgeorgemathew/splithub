export type DefiVenueId = "aave" | "morpho_blue" | "compound_v3" | "balancer";

export type ScanSourceId = "chip_balance" | "agent_liquid" | DefiVenueId;

export interface DefiVenueCandidate {
  id: DefiVenueId;
  label: string;
  mockedApyPct: string;
  mockedOutlook: "good" | "bad";
  liquidityProfile: "high" | "medium" | "low";
  executionStatus: "supported_now" | "mocked_only";
  notes: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export interface ScanSourceConfig {
  id: ScanSourceId;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const SCAN_SOURCES: ScanSourceConfig[] = [
  {
    id: "chip_balance",
    label: "Chip Balance",
    color: "text-sky-400",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/40",
  },
  {
    id: "agent_liquid",
    label: "Agent Reserve",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/40",
  },
  {
    id: "aave",
    label: "Aave",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/40",
  },
  {
    id: "morpho_blue",
    label: "Morpho Blue",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/40",
  },
];

export function getMockDefiVenueCandidates(): DefiVenueCandidate[] {
  return [
    {
      id: "aave",
      label: "Aave",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/40",
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
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/40",
      mockedApyPct: "0.35",
      mockedOutlook: "bad",
      liquidityProfile: "medium",
      executionStatus: "mocked_only",
      notes: "Mocked as unattractive for now because the effective yield is too low for idle cash.",
    },
    {
      id: "compound_v3",
      label: "Compound V3",
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/40",
      mockedApyPct: "0.18",
      mockedOutlook: "bad",
      liquidityProfile: "medium",
      executionStatus: "mocked_only",
      notes: "Mocked as unattractive because the yield is lower than Aave and does not justify moving funds there.",
    },
    {
      id: "balancer",
      label: "Balancer",
      color: "text-rose-400",
      bgColor: "bg-rose-500/10",
      borderColor: "border-rose-500/40",
      mockedApyPct: "-0.80",
      mockedOutlook: "bad",
      liquidityProfile: "low",
      executionStatus: "mocked_only",
      notes: "Mocked as unattractive because the strategy is assumed to be net negative after fees and slippage.",
    },
  ];
}
