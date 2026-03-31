import { formatUsd } from "./checkout/shared";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import type { StoreWithCatalog } from "~~/lib/store.types";

export function StoreCatalogGrid({
  items,
  quantities,
  onUpdateQuantity,
}: {
  items: StoreWithCatalog["items"];
  quantities: Record<number, number>;
  onUpdateQuantity: (itemId: number, next: number) => void;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <ShoppingCart className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Catalog</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map(item => {
          const stock = item.inventory?.current_stock ?? 0;
          const selected = quantities[item.id] || 0;
          const disabled = item.status !== "active";

          return (
            <div key={item.id} className="rounded-3xl border border-white/10 bg-base-200/50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-base-content/50">{item.sku}</div>
                  <h3 className="mt-2 text-lg font-bold">{item.name}</h3>
                  <p className="mt-1 text-sm text-base-content/60">{item.description || "Store item"}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-primary">{formatUsd(Number(item.price))}</div>
                  <div className="text-xs capitalize text-base-content/50">{item.status.replaceAll("_", " ")}</div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-2xl bg-base-100/80 px-4 py-3">
                <div>
                  <div className="text-xs text-base-content/50">Current stock</div>
                  <div className="font-semibold">{stock}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="btn btn-circle btn-sm btn-ghost"
                    onClick={() => onUpdateQuantity(item.id, selected - 1)}
                    disabled={selected === 0 || disabled}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{selected}</span>
                  <button
                    className="btn btn-circle btn-sm btn-ghost"
                    onClick={() => onUpdateQuantity(item.id, selected + 1)}
                    disabled={disabled || selected >= stock}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
