import { Divide, Users } from "lucide-react";

interface SplitSummaryProps {
  totalAmount: string;
  participantCount: number;
  currency?: string;
}

export const SplitSummary = ({ totalAmount, participantCount, currency = "USDC" }: SplitSummaryProps) => {
  const total = parseFloat(totalAmount) || 0;
  const perPerson = participantCount > 0 ? (total / participantCount).toFixed(2) : "0.00";

  return (
    <div className="w-full bg-primary/10 border border-primary/20 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Divide className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="text-xs font-semibold text-base-content/50 uppercase tracking-wider block">
              Per person
            </span>
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-base-content/50" />
              <span className="text-sm font-medium text-base-content/70">
                {participantCount} {participantCount === 1 ? "person" : "people"}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-2xl font-bold text-primary">${perPerson}</span>
          <span className="text-sm font-semibold text-primary/60 ml-1">{currency}</span>
        </div>
      </div>
    </div>
  );
};
