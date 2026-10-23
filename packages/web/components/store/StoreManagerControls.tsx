import type { ItemFormState } from "./checkout/shared";
import { ShieldCheck } from "lucide-react";

export function StoreManagerControls({
  itemForm,
  onItemFormChange,
  managerBusy,
  managerError,
  onAddItem,
}: {
  itemForm: ItemFormState;
  onItemFormChange: (next: ItemFormState) => void;
  managerBusy: boolean;
  managerError: string | null;
  onAddItem: () => void;
}) {
  return (
    <div className="mt-8 rounded-3xl border border-white/10 bg-base-200/50 p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Manager Controls</h2>
      </div>
      <div className="mt-4 space-y-5">
        <div className="rounded-2xl border border-white/10 bg-base-100/40 p-4">
          <div className="text-sm font-semibold">Catalog Setup</div>
          <div className="mt-1 text-xs text-base-content/55">Add products and starting inventory for this store.</div>
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
          <div className="mt-4">
            <button className="btn btn-primary" onClick={onAddItem} disabled={managerBusy}>
              Add Item
            </button>
          </div>
        </div>
      </div>
      {managerError && <div className="mt-3 text-sm text-error">{managerError}</div>}
    </div>
  );
}
