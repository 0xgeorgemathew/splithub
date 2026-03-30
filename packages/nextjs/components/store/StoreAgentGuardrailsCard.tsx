import { formatUsd } from "./checkout/shared";
import { Bot } from "lucide-react";
import type { StoreWithCatalog } from "~~/lib/store.types";

export function StoreAgentGuardrailsCard({ store }: { store: StoreWithCatalog }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-base-200/60 p-5">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Agent Guardrails</h2>
      </div>
      <ul className="mt-4 space-y-3 text-sm text-base-content/65">
        <li>Daily call budget: {store.manager_agent?.budget_daily_calls ?? 0}</li>
        <li>Daily token budget: {store.manager_agent?.budget_daily_tokens ?? 0}</li>
        <li>Max restock value: {formatUsd(Number(store.manager_agent?.max_restock_value ?? 0))}</li>
        <li>Max price change: {store.manager_agent?.max_price_change_pct ?? 0}%</li>
        <li>Minimum confidence: {store.manager_agent?.min_confidence ?? 0}</li>
      </ul>
    </div>
  );
}
