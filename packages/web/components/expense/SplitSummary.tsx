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
    <div className="w-full bg-primary/10 border border-primary/20 rounded-xl px-3 py-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
            <Divide className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-base-content/50 uppercase tracking-wider block">
              Per person
            </span>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3 text-base-content/50" />
              <span className="text-xs font-medium text-base-content/70">
                {participantCount} {participantCount === 1 ? "person" : "people"}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xl font-bold text-primary">${perPerson}</span>
          <span className="text-xs font-semibold text-primary/60 ml-0.5">{currency}</span>
        </div>
      </div>
    </div>
  );
};
