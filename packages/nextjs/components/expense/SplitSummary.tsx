import { Users } from "lucide-react";

interface SplitSummaryProps {
  totalAmount: string;
  participantCount: number;
  currency?: string;
}

export const SplitSummary = ({ totalAmount, participantCount, currency = "USDC" }: SplitSummaryProps) => {
  const total = parseFloat(totalAmount) || 0;
  const perPerson = participantCount > 0 ? (total / participantCount).toFixed(6) : "0.00";

  // Remove trailing zeros
  const formattedPerPerson = parseFloat(perPerson).toString();

  return (
    <div className="w-full bg-base-100 rounded-xl px-3 py-2.5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary/80" />
          <span className="text-sm font-medium text-base-content/70">Split equally</span>
          <span className="text-sm font-semibold text-base-content">
            {participantCount} {participantCount === 1 ? "person" : "people"}
          </span>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-primary">{formattedPerPerson}</span>
          <span className="text-sm font-semibold text-primary/70">{currency}</span>
          <span className="text-xs text-base-content/50">each</span>
        </div>
      </div>
    </div>
  );
};
