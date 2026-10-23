import { useCallback, useEffect, useState } from "react";
import { formatUsd } from "./checkout/shared";
import { ChartNoAxesCombined, PackagePlus, Power, ShieldCheck } from "lucide-react";
import { apiFetch } from "~~/lib/apiFetch";
import type { StoreAnalytics, StoreWithCatalog } from "~~/lib/store.types";

type Item = StoreWithCatalog["items"][number];

const EMPTY_ITEM = { name: "", price: "", stock: "", description: "", imageUrl: "" };

function ItemRow({
  item,
  onSave,
}: {
  item: Item;
  onSave: (item: Item, changes: Record<string, unknown>) => Promise<void>;
}) {
  const [price, setPrice] = useState(String(item.price));
  const [stock, setStock] = useState(String(item.stock));
  const [busy, setBusy] = useState(false);

  const save = async (changes: Record<string, unknown>) => {
    setBusy(true);
    try {
      await onSave(item, changes);
    } finally {
      setBusy(false);
    }
  };

  const paused = item.status === "paused";
  const changed = Number(price) !== Number(item.price) || Number(stock) !== item.stock;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-base-100/40 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{item.name}</div>
        <div className="text-xs text-base-content/50">
          {paused ? "Paused" : item.stock > 0 ? "On sale" : "Sold out"}
        </div>
      </div>
      <label className="flex items-center gap-1 text-xs text-base-content/50">
        $
        <input
          value={price}
          onChange={event => setPrice(event.target.value)}
          className="input input-bordered input-sm w-20"
          type="number"
          min="0"
          step="0.01"
          aria-label={`Price for ${item.name}`}
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-base-content/50">
        Stock
        <input
          value={stock}
          onChange={event => setStock(event.target.value)}
          className="input input-bordered input-sm w-20"
          type="number"
          min="0"
          aria-label={`Stock for ${item.name}`}
        />
      </label>
      <button
        className="btn btn-sm"
        disabled={busy || !changed}
        onClick={() => save({ price: Number(price), stock: Number(stock) })}
      >
        Save
      </button>
      <button
        className="btn btn-ghost btn-sm"
        disabled={busy}
        onClick={() => save({ status: paused ? "active" : "paused" })}
      >
        {paused ? "Resume" : "Pause"}
      </button>
    </div>
  );
}

/** Owner-only panel on the store page: open/pause, sales, catalog and stock, and adding items. */
export function StoreOwnerControls({ store, onChanged }: { store: StoreWithCatalog; onChanged: () => void }) {
  const [analytics, setAnalytics] = useState<StoreAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [addBusy, setAddBusy] = useState(false);

  const loadAnalytics = useCallback(async () => {
    const response = await apiFetch(`/api/stores/${store.id}/analytics`);
    const result = await response.json().catch(() => ({}));
    if (response.ok) setAnalytics(result.analytics);
  }, [store.id]);

  // Reload sales whenever the store data changes (after a checkout or an edit).
  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics, store]);

  const send = async (url: string, method: "PATCH" | "POST", body: unknown) => {
    setError(null);
    const response = await apiFetch(url, { method, body: JSON.stringify(body) });
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
    await send(`/api/stores/${store.id}`, "PATCH", { status: store.status === "active" ? "paused" : "active" });
    setStatusBusy(false);
  };

  const saveItem = async (item: Item, changes: Record<string, unknown>) => {
    await send(`/api/stores/${store.id}/items/${item.id}`, "PATCH", changes);
  };

  const addItem = async () => {
    setAddBusy(true);
    const ok = await send(`/api/stores/${store.id}/items`, "POST", {
      name: itemForm.name,
      price: Number(itemForm.price),
      stock: Number(itemForm.stock || 0),
      description: itemForm.description || null,
      imageUrl: itemForm.imageUrl || null,
    });
    if (ok) setItemForm(EMPTY_ITEM);
    setAddBusy(false);
  };

  const isOpen = store.status === "active";
  const field = (key: keyof typeof EMPTY_ITEM) => ({
    value: itemForm[key],
    onChange: (event: { target: { value: string } }) => setItemForm({ ...itemForm, [key]: event.target.value }),
  });

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
        {isOpen
          ? "Open: shoppers can tap to pay. Payments go straight to your wallet."
          : "Paused: the store is hidden from the public list and checkout is off."}
      </div>

      <div className="mt-5 space-y-5">
        <div className="rounded-2xl border border-white/10 bg-base-100/40 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ChartNoAxesCombined className="h-4 w-4 text-primary" />
            Sales
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {[
              { label: "Revenue", value: analytics ? formatUsd(analytics.totalRevenue) : "…" },
              { label: "Orders", value: analytics?.totalOrders ?? "…" },
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
          {analytics && analytics.recentOrders.length > 0 && (
            <div className="mt-3 space-y-1">
              <div className="text-xs font-semibold text-base-content/60">Recent orders</div>
              {analytics.recentOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between gap-3 text-xs text-base-content/60">
                  <span className="truncate">
                    #{order.id} ·{" "}
                    {order.buyer_name || `${order.buyer_wallet.slice(0, 6)}…${order.buyer_wallet.slice(-4)}`} ·{" "}
                    {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                  </span>
                  <span className="shrink-0 font-semibold text-base-content/80">{formatUsd(order.subtotal)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {store.items.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-base-100/40 p-4">
            <div className="text-sm font-semibold">Catalog and stock</div>
            <div className="mt-1 text-xs text-base-content/55">Change prices, restock, or pause items.</div>
            <div className="mt-3 space-y-2">
              {store.items.map(item => (
                <ItemRow key={`${item.id}-${item.price}-${item.stock}`} item={item} onSave={saveItem} />
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
              <span className="text-sm text-base-content/60">Name</span>
              <input {...field("name")} className="input input-bordered" />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-base-content/60">Price (USDC)</span>
              <input {...field("price")} className="input input-bordered" type="number" min="0" step="0.01" />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-base-content/60">Stock</span>
              <input {...field("stock")} className="input input-bordered" type="number" min="0" />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-base-content/60">Image URL (optional)</span>
              <input {...field("imageUrl")} className="input input-bordered" placeholder="https://" />
            </label>
            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-sm text-base-content/60">Description (optional)</span>
              <input {...field("description")} className="input input-bordered" />
            </label>
          </div>
          <div className="mt-4">
            <button
              className="btn btn-primary"
              onClick={addItem}
              disabled={addBusy || !itemForm.name.trim() || itemForm.price === ""}
            >
              Add Item
            </button>
          </div>
        </div>
      </div>
      {error && <div className="mt-3 text-sm text-error">{error}</div>}
    </div>
  );
}
