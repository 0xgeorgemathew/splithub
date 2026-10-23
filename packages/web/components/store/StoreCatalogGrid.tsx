import { formatUsd } from "./checkout/shared";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import type { StoreWithCatalog } from "~~/lib/store.types";

export function StoreCatalogGrid({
  items,
  quantities,
  onUpdateQuantity,
  isOwner,
}: {
  items: StoreWithCatalog["items"];
  quantities: Record<number, number>;
  onUpdateQuantity: (itemId: number, next: number) => void;
  isOwner: boolean;
}) {
  // Shoppers only see items on sale; the owner sees paused items too (marked) so the catalog matches Manage.
  const visible = isOwner ? items : items.filter(item => item.status === "active");

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <ShoppingCart className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Catalog</h2>
      </div>
      {!visible.length ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-base-200/40 p-5 text-sm text-base-content/60">
          {isOwner
            ? "This store does not have any items yet. Add your first item below to start selling."
            : "This store has nothing for sale yet."}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map(item => {
            const stock = item.stock ?? 0;
            const selected = quantities[item.id] || 0;
            const paused = item.status !== "active";
            const soldOut = stock <= 0;

            return (
              <div key={item.id} className="rounded-3xl border border-white/10 bg-base-200/50 p-5">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt=""
                    className="mb-4 h-40 w-full rounded-2xl object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold">{item.name}</h3>
                    {item.description && <p className="mt-1 text-sm text-base-content/60">{item.description}</p>}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-primary">{formatUsd(Number(item.price))}</div>
                    {(paused || soldOut) && (
                      <div className="text-xs text-base-content/50">{paused ? "Paused" : "Sold out"}</div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-2xl bg-base-100/80 px-4 py-3">
                  <div>
                    <div className="text-xs text-base-content/50">In stock</div>
                    <div className="font-semibold">{stock}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn-circle btn-sm btn-ghost"
                      onClick={() => onUpdateQuantity(item.id, selected - 1)}
                      disabled={selected === 0 || paused}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{selected}</span>
                    <button
                      className="btn btn-circle btn-sm btn-ghost"
                      onClick={() => onUpdateQuantity(item.id, selected + 1)}
                      disabled={paused || selected >= stock}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
