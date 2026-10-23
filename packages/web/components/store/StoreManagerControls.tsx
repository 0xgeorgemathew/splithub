import { useCallback, useEffect, useState } from "react";
import { type ItemFormState, formatUsd } from "./checkout/shared";
import { ChartNoAxesCombined, PackagePlus, Power, ShieldCheck } from "lucide-react";
import { apiFetch } from "~~/lib/apiFetch";
import type { StoreAnalytics, StoreWithCatalog } from "~~/lib/store.types";

type Item = StoreWithCatalog["items"][number];

function InventoryRow({
  item,
  onSave,
}: {
  item: Item;
  onSave: (item: Item, stock: number, status?: Item["status"]) => Promise<void>;
}) {
  const currentStock = item.inventory?.current_stock ?? 0;
  const [stock, setStock] = useState(String(currentStock));
  const [busy, setBusy] = useState(false);

  const save = async (status?: Item["status"]) => {
    setBusy(true);
    try {
      await onSave(item, Number(stock), status);
    } finally {
      setBusy(false);
    }
  };

  const paused = item.status === "paused";
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-base-100/40 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{item.name}</div>
        <div className="text-xs text-base-content/50">
          {formatUsd(Number(item.price))} · <span className="capitalize">{item.status.replaceAll("_", " ")}</span>
        </div>
      </div>
      <input
        value={stock}
        onChange={event => setStock(event.target.value)}
        className="input input-bordered input-sm w-20"
        type="number"
        min="0"
        aria-label={`Stock for ${item.name}`}
      />
      <button
        className="btn btn-sm"
        disabled={busy || Number(stock) === currentStock}
        onClick={() => save(item.status === "out_of_stock" && Number(stock) > 0 ? "active" : undefined)}
      >
        Save stock
      </button>
      <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => save(paused ? "active" : "paused")}>
        {paused ? "Resume" : "Pause"}
      </button>
    </div>
  );
}

export function StoreManagerControls({
  store,
  itemForm,
  onItemFormChange,
  managerBusy,
  managerError,
  onAddItem,
  onChanged,
}: {
  store: StoreWithCatalog;
  itemForm: ItemFormState;
  onItemFormChange: (next: ItemFormState) => void;
  managerBusy: boolean;
  managerError: string | null;
  onAddItem: () => void;
  onChanged: () => void;
}) {
  const [analytics, setAnalytics] = useState<StoreAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);

  const loadAnalytics = useCallback(async () => {
    const response = await apiFetch(`/api/stores/${store.id}/analytics`);
    const result = await response.json().catch(() => ({}));
    if (response.ok) setAnalytics(result.analytics);
  }, [store.id]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const request = async (url: string, body: unknown) => {
    setError(null);
    const response = await apiFetch(url, { method: "PATCH", body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error || "Update failed");
      return false;
    }
    onChanged();
    return true;
  };

  const toggleStore = async () => {
    setStatusBusy(true);
    await request(`/api/stores/${store.id}`, { status: store.status === "active" ? "paused" : "active" });
    setStatusBusy(false);
  };

  const saveItem = async (item: Item, stock: number, status?: Item["status"]) => {
    await request(`/api/stores/${store.id}/items/${item.id}`, { currentStock: stock, ...(status ? { status } : {}) });
  };

  const isOpen = store.status === "active";

  return (
    <div className="mt-8 rounded-3xl border border-white/10 bg-base-200/50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Manage Store</h2>
        </div>
        <button
          className={`btn btn-sm ${isOpen ? "btn-outline" : "btn-primary"}`}
          onClick={toggleStore}
          disabled={statusBusy}
        >
          <Power className="h-4 w-4" />
          {isOpen ? "Pause store" : "Open store"}
        </button>
      </div>
      <div className="mt-1 text-xs text-base-content/55">
        {isOpen ? "Open: shoppers can tap to pay." : "Paused: the store is hidden from the public list."}
      </div>

      <div className="mt-5 space-y-5">
        <div className="rounded-2xl border border-white/10 bg-base-100/40 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ChartNoAxesCombined className="h-4 w-4 text-primary" />
            Sales
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Revenue", value: analytics ? formatUsd(analytics.totalRevenue) : "…" },
              { label: "Orders", value: analytics?.totalOrders ?? "…" },
              { label: "Manager share", value: analytics ? formatUsd(analytics.managerRevenue) : "…" },
              { label: "Low stock", value: analytics?.lowStockItems ?? "…" },
            ].map(metric => (
              <div key={metric.label} className="rounded-xl bg-base-200/60 px-3 py-2">
                <div className="text-xs text-base-content/50">{metric.label}</div>
                <div className="mt-1 font-semibold">{metric.value}</div>
              </div>
            ))}
          </div>
          {analytics && analytics.topItems.length > 0 && (
            <div className="mt-3 text-xs text-base-content/60">
              Top sellers: {analytics.topItems.map(item => `${item.name} (${item.quantitySold})`).join(", ")}
            </div>
          )}
        </div>

        {store.items.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-base-100/40 p-4">
            <div className="text-sm font-semibold">Inventory</div>
            <div className="mt-1 text-xs text-base-content/55">Restock items or pause them without deleting.</div>
            <div className="mt-3 space-y-2">
              {store.items.map(item => (
                <InventoryRow key={`${item.id}-${item.inventory?.current_stock ?? 0}`} item={item} onSave={saveItem} />
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-base-100/40 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <PackagePlus className="h-4 w-4 text-primary" />
            Add an item
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
              <span className="text-sm text-base-content/60">Price (USDC)</span>
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
          <div className="mt-4">
            <button
              className="btn btn-primary"
              onClick={onAddItem}
              disabled={managerBusy || !itemForm.sku.trim() || !itemForm.name.trim() || !itemForm.price}
            >
              Add Item
            </button>
          </div>
        </div>
      </div>
      {(managerError || error) && <div className="mt-3 text-sm text-error">{managerError || error}</div>}
    </div>
  );
}
