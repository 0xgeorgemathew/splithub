import type { AgentFeedback, ItemFormState } from "./checkout/shared";
import { ShieldCheck } from "lucide-react";
import type { StoreWithCatalog } from "~~/lib/store.types";

export function StoreManagerControls({
  store,
  itemForm,
  onItemFormChange,
  managerBusy,
  managerError,
  agentFeedback,
  onAddItem,
  onCreateAgent,
  onAgentRun,
  onAgentPause,
}: {
  store: StoreWithCatalog;
  itemForm: ItemFormState;
  onItemFormChange: (next: ItemFormState) => void;
  managerBusy: boolean;
  managerError: string | null;
  agentFeedback: AgentFeedback | null;
  onAddItem: () => void;
  onCreateAgent: () => void;
  onAgentRun: () => void;
  onAgentPause: (status: "active" | "paused") => void;
}) {
  return (
    <div className="mt-8 rounded-3xl border border-white/10 bg-base-200/50 p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Manager Controls</h2>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm text-base-content/60">SKU</span>
          <input
            value={itemForm.sku}
            onChange={event => onItemFormChange({ ...itemForm, sku: event.target.value })}
            className="input input-bordered"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm text-base-content/60">Name</span>
          <input
            value={itemForm.name}
            onChange={event => onItemFormChange({ ...itemForm, name: event.target.value })}
            className="input input-bordered"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm text-base-content/60">Price</span>
          <input
            value={itemForm.price}
            onChange={event => onItemFormChange({ ...itemForm, price: event.target.value })}
            className="input input-bordered"
            type="number"
            min="0"
            step="0.01"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm text-base-content/60">Starting Stock</span>
          <input
            value={itemForm.stock}
            onChange={event => onItemFormChange({ ...itemForm, stock: event.target.value })}
            className="input input-bordered"
            type="number"
            min="0"
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button className="btn btn-primary" onClick={onAddItem} disabled={managerBusy}>
          Add Item
        </button>
        {!store.manager_agent ? (
          <button className="btn btn-outline" onClick={onCreateAgent} disabled={managerBusy}>
            Add Agent
          </button>
        ) : (
          <>
            <button className="btn btn-outline" onClick={onAgentRun} disabled={managerBusy}>
              Run Agent
            </button>
            {store.manager_agent.status === "paused" ? (
              <button className="btn btn-outline" onClick={() => onAgentPause("active")} disabled={managerBusy}>
                Resume Agent
              </button>
            ) : (
              <button className="btn btn-outline" onClick={() => onAgentPause("paused")} disabled={managerBusy}>
                Pause Agent
              </button>
            )}
          </>
        )}
      </div>
      {managerError && <div className="mt-3 text-sm text-error">{managerError}</div>}
      {agentFeedback && (
        <div className="mt-4 rounded-2xl border border-success/25 bg-success/10 px-4 py-4 text-sm">
          <div className="font-semibold text-success">Agent run completed</div>
          <div className="mt-2 capitalize text-base-content/70">State: {agentFeedback.state}</div>
          <div className="mt-1 text-base-content/70">{agentFeedback.summary}</div>
          <div className="mt-2 text-base-content/60">Actions executed: {agentFeedback.actionCount}</div>
          {agentFeedback.validationStatus && (
            <div className="mt-1 text-base-content/50">Validation record: {agentFeedback.validationStatus}</div>
          )}
        </div>
      )}
    </div>
  );
}
