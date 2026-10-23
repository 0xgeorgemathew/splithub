"use client";

import { useMemo, useState } from "react";
import { StoreActivityLogCard } from "./StoreActivityLogCard";
import { StoreCatalogGrid } from "./StoreCatalogGrid";
import { StoreCheckoutPanel } from "./StoreCheckoutPanel";
import { StoreHero } from "./StoreHero";
import { StoreManagerControls } from "./StoreManagerControls";
import type { CheckoutLog, ItemFormState } from "./checkout/shared";
import { usePrivy } from "@privy-io/react-auth";
import type { Address } from "viem";
import { useCurrentUser } from "~~/hooks/useCurrentUser";
import { type TapPaymentStep, useTapPayment } from "~~/hooks/useTapPayment";
import type { CheckoutQuote, StoreWithCatalog } from "~~/lib/store.types";

const STEP_LOGS: Record<TapPaymentStep, string> = {
  identifying: "Tap the buyer's chip to identify their wallet.",
  tapping: "Tap again to authorize the payment.",
  submitting: "Submitting the chip-authorized payment to Base Sepolia.",
  confirming: "Waiting for the payment to confirm.",
};

export function StoreCheckoutClient({ store }: { store: StoreWithCatalog }) {
  const { authenticated, login, user } = usePrivy();
  const wallet = user?.wallet?.address;
  const { chipAddress } = useCurrentUser();
  const { pay } = useTapPayment();
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [logs, setLogs] = useState<CheckoutLog[]>([]);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ txHash: string; orderId: number } | null>(null);
  const [managerBusy, setManagerBusy] = useState(false);
  const [managerError, setManagerError] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormState>({
    sku: "",
    name: "",
    price: "",
    stock: "",
  });

  const isManager = wallet?.toLowerCase() === store.operator_wallet?.toLowerCase();
  const isAdmin = wallet?.toLowerCase() === store.network?.owner_wallet?.toLowerCase();
  const canManage = Boolean(isManager || isAdmin);

  const cart = useMemo(
    () =>
      store.items
        .filter(item => item.status === "active" && (quantities[item.id] || 0) > 0)
        .map(item => ({
          itemId: item.id,
          quantity: quantities[item.id],
          item,
        })),
    [quantities, store.items],
  );

  const cartTotal = cart.reduce((sum, line) => sum + Number(line.item.price) * line.quantity, 0);
  const cartLines = cart.map(line => ({ itemId: line.itemId, quantity: line.quantity }));

  const pushLog = (message: string, tone: CheckoutLog["tone"] = "info") => {
    setLogs(prev => [
      ...prev,
      {
        time: new Date().toLocaleTimeString(),
        message,
        tone,
      },
    ]);
  };

  const updateQuantity = (itemId: number, next: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, next),
    }));
  };

  const handleCheckout = async () => {
    if (!authenticated || !wallet) {
      login();
      return;
    }

    setCheckoutBusy(true);
    setCheckoutError(null);
    setReceipt(null);
    setLogs([]);

    try {
      pushLog("Requesting a fresh server-side quote for the cart.");
      const quoteResponse = await fetch(`/api/stores/${store.id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "quote", cart: cartLines }),
      });
      const quoteResult = await quoteResponse.json();
      if (!quoteResponse.ok) {
        throw new Error(quoteResult.error || "Failed to quote cart");
      }
      const quote = quoteResult.quote as CheckoutQuote;

      // Staff checking out a customer on this device identify the buyer by chip; everyone else pays
      // with their own registered chip in a single tap.
      const payer = !canManage && chipAddress ? (wallet as Address) : undefined;
      const { txHash } = await pay(
        {
          payer,
          recipient: quote.payoutRecipient,
          token: quote.tokenAddress as Address,
          amount: BigInt(quote.payoutAmountMicros),
        },
        step => pushLog(STEP_LOGS[step]),
      );

      pushLog("Payment confirmed. Recording the order.");
      const confirmResponse = await fetch(`/api/stores/${store.id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "confirm", cart: cartLines, txHash }),
      });
      const confirmResult = await confirmResponse.json();
      if (!confirmResponse.ok) {
        throw new Error(
          `${confirmResult.error || "Failed to confirm checkout"} (payment ${txHash.slice(0, 10)}… is on-chain)`,
        );
      }

      pushLog("Checkout confirmed on-chain and recorded in the store ledger.", "success");
      if (confirmResult.inventoryWarning) {
        pushLog(confirmResult.inventoryWarning, "error");
      }
      setReceipt({ txHash, orderId: confirmResult.order.id });
      setQuantities({});
    } catch (error) {
      const message = error instanceof Error ? error.message : "Checkout failed";
      setCheckoutError(message);
      pushLog(message, "error");
    } finally {
      setCheckoutBusy(false);
    }
  };

  const handleAddItem = async () => {
    setManagerBusy(true);
    setManagerError(null);
    try {
      const response = await fetch(`/api/stores/${store.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: itemForm.sku,
          name: itemForm.name,
          price: Number(itemForm.price),
          currentStock: Number(itemForm.stock || 0),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to add item");
      }
      window.location.reload();
    } catch (error) {
      setManagerError(error instanceof Error ? error.message : "Failed to add item");
    } finally {
      setManagerBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 pb-24 md:px-6 lg:px-8">
      <StoreHero store={store} />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <StoreCatalogGrid items={store.items} quantities={quantities} onUpdateQuantity={updateQuantity} />
          {canManage && (
            <StoreManagerControls
              itemForm={itemForm}
              onItemFormChange={setItemForm}
              managerBusy={managerBusy}
              managerError={managerError}
              onAddItem={handleAddItem}
            />
          )}
        </div>

        <div className="space-y-6">
          <StoreCheckoutPanel
            cart={cart}
            cartTotal={cartTotal}
            authenticated={authenticated}
            checkoutBusy={checkoutBusy}
            checkoutError={checkoutError}
            receipt={receipt}
            onCheckout={handleCheckout}
          />
          <StoreActivityLogCard logs={logs} />
        </div>
      </div>
    </div>
  );
}
