import type { CartEntry } from "./checkout/shared";
import { formatUsd } from "./checkout/shared";
import { Receipt } from "lucide-react";

export function StoreCheckoutPanel({
  cart,
  cartTotal,
  authenticated,
  checkoutBusy,
  checkoutError,
  receipt,
  onCheckout,
}: {
  cart: CartEntry[];
  cartTotal: number;
  authenticated: boolean;
  checkoutBusy: boolean;
  checkoutError: string | null;
  receipt: { txHash: string; orderId: number } | null;
  onCheckout: () => void;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-base-200/60 p-5">
      <div className="flex items-center gap-2">
        <Receipt className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Checkout</h2>
      </div>

      <div className="mt-4 space-y-3">
        {cart.length ? (
          cart.map(line => (
            <div key={line.itemId} className="flex items-center justify-between rounded-2xl bg-base-100/80 px-4 py-3">
              <div>
                <div className="font-semibold">{line.item.name}</div>
                <div className="text-xs text-base-content/50">
                  {line.quantity} × {formatUsd(Number(line.item.price))}
                </div>
              </div>
              <div className="font-semibold">{formatUsd(Number(line.item.price) * line.quantity)}</div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-base-content/55">
            Select one or more items to build a cart.
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl bg-primary/10 px-4 py-4">
        <div className="flex items-center justify-between text-sm">
          <span>Total</span>
          <span className="text-xl font-black text-primary">{formatUsd(cartTotal)}</span>
        </div>
        <div className="mt-2 text-xs text-base-content/60">
          Current contract flow requires 3 taps: discover chip, sign manager payout, sign admin payout.
        </div>
      </div>

      <button className="btn btn-primary mt-4 w-full" onClick={onCheckout} disabled={checkoutBusy || cart.length === 0}>
        {checkoutBusy ? "Processing checkout..." : authenticated ? "Tap to Checkout" : "Login to Checkout"}
      </button>

      {checkoutError && <div className="mt-3 text-sm text-error">{checkoutError}</div>}
      {receipt && (
        <div className="mt-4 rounded-2xl border border-success/30 bg-success/10 px-4 py-4 text-sm">
          <div className="font-semibold text-success">Checkout complete</div>
          <div className="mt-2 text-base-content/70">Order #{receipt.orderId}</div>
          <div className="mt-1 break-all text-xs text-base-content/60">{receipt.txHash}</div>
        </div>
      )}
    </div>
  );
}
