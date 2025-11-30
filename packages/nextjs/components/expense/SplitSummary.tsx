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
    <div className="w-full bg-base-100 rounded-[15px] p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <Users className="w-5 h-5 text-primary/80" />
        <span className="text-base font-medium text-base-content/70">Split equally</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-base-content/50 font-medium">Participants</span>
          <span className="text-lg font-semibold text-base-content">
            {participantCount} {participantCount === 1 ? "person" : "people"}
          </span>
        </div>

        <div className="h-12 w-px bg-base-300/50" />

        <div className="flex flex-col items-end gap-0.5">
          <span className="text-sm text-base-content/50 font-medium">Per person</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">{formattedPerPerson}</span>
            <span className="text-base font-semibold text-primary/70">{currency}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
