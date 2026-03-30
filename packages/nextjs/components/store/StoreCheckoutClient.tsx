"use client";

import { useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Bot, Minus, Plus, Receipt, ShieldCheck, ShoppingCart, Sparkles, Store } from "lucide-react";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import deployedContracts from "~~/contracts/deployedContracts";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import type { StoreWithCatalog } from "~~/lib/store.types";

const CHAIN_ID = 84532;

const PAYMENT_AUTH_TYPES = {
  PaymentAuth: [
    { name: "payer", type: "address" },
    { name: "recipient", type: "address" },
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

const REGISTRY_ABI = [
  {
    type: "function",
    name: "ownerOf",
    inputs: [{ name: "signer", type: "address" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;

const PAYMENTS_ABI = [
  {
    type: "function",
    name: "nonces",
    inputs: [{ name: "payer", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const formatUsd = (value: number) => `$${value.toFixed(2)}`;

type CheckoutLog = {
  time: string;
  message: string;
  tone: "info" | "success" | "error";
};

type AgentFeedback = {
  state: string;
  summary: string;
  actionCount: number;
  validationStatus?: string;
};

export function StoreCheckoutClient({ store }: { store: StoreWithCatalog }) {
  const { authenticated, login, user } = usePrivy();
  const wallet = user?.wallet?.address;
  const { signTypedData } = useHaloChip();
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [logs, setLogs] = useState<CheckoutLog[]>([]);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ txHash: string; orderId: number } | null>(null);
  const [managerBusy, setManagerBusy] = useState(false);
  const [managerError, setManagerError] = useState<string | null>(null);
  const [agentFeedback, setAgentFeedback] = useState<AgentFeedback | null>(null);
  const [itemForm, setItemForm] = useState({
    sku: "",
    name: "",
    price: "",
    stock: "",
  });

  const chainContracts = deployedContracts[CHAIN_ID] as Record<string, { address: string }> | undefined;
  const paymentsAddress = chainContracts?.SplitHubPayments?.address as `0x${string}` | undefined;
  const registryAddress = chainContracts?.SplitHubRegistry?.address as `0x${string}` | undefined;

  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: baseSepolia,
        transport: http(),
      }),
    [],
  );

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

    if (!paymentsAddress || !registryAddress) {
      setCheckoutError("Payment contracts are not configured on this network");
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
        body: JSON.stringify({
          intent: "quote",
          cart: cart.map(line => ({ itemId: line.itemId, quantity: line.quantity })),
        }),
      });
      const quoteResult = await quoteResponse.json();
      if (!quoteResponse.ok) {
        throw new Error(quoteResult.error || "Failed to quote cart");
      }
      const quote = quoteResult.quote;

      const domain = {
        name: "SplitHubPayments",
        version: "1",
        chainId: BigInt(CHAIN_ID),
        verifyingContract: paymentsAddress,
      };

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

      pushLog("Tap 1 of 3: discovering the Halo chip owner.");
      const discovery = await signTypedData({
        domain,
        types: PAYMENT_AUTH_TYPES,
        primaryType: "PaymentAuth",
        message: {
          payer: "0x0000000000000000000000000000000000000000",
          recipient: quote.managerRecipient,
          token: quote.tokenAddress,
          amount: BigInt(quote.managerAmountMicros),
          nonce: 0n,
          deadline,
        },
      });

      const chipAddress = discovery.address as `0x${string}`;
      const payerWallet = (await publicClient.readContract({
        address: registryAddress,
        abi: REGISTRY_ABI,
        functionName: "ownerOf",
        args: [chipAddress],
      })) as `0x${string}`;

      if (!payerWallet || payerWallet === "0x0000000000000000000000000000000000000000") {
        throw new Error("Chip is not registered to a payer wallet");
      }

      const nonce = (await publicClient.readContract({
        address: paymentsAddress,
        abi: PAYMENTS_ABI,
        functionName: "nonces",
        args: [payerWallet],
      })) as bigint;

      pushLog("Tap 2 of 3: signing manager payout.");
      const managerSignature = await signTypedData({
        domain,
        types: PAYMENT_AUTH_TYPES,
        primaryType: "PaymentAuth",
        message: {
          payer: payerWallet,
          recipient: quote.managerRecipient,
          token: quote.tokenAddress,
          amount: BigInt(quote.managerAmountMicros),
          nonce,
          deadline,
        },
      });

      pushLog("Tap 3 of 3: signing admin payout.");
      const adminSignature = await signTypedData({
        domain,
        types: PAYMENT_AUTH_TYPES,
        primaryType: "PaymentAuth",
        message: {
          payer: payerWallet,
          recipient: quote.adminRecipient,
          token: quote.tokenAddress,
          amount: BigInt(quote.adminAmountMicros),
          nonce: nonce + 1n,
          deadline,
        },
      });

      pushLog("Submitting split checkout to the batch relayer.");
      const confirmResponse = await fetch(`/api/stores/${store.id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "confirm",
          buyerWallet: payerWallet,
          cart: cart.map(line => ({ itemId: line.itemId, quantity: line.quantity })),
          payments: [
            {
              payer: payerWallet,
              recipient: quote.managerRecipient,
              token: quote.tokenAddress,
              amount: quote.managerAmountMicros,
              nonce: nonce.toString(),
              deadline: deadline.toString(),
              signature: managerSignature.signature,
            },
            {
              payer: payerWallet,
              recipient: quote.adminRecipient,
              token: quote.tokenAddress,
              amount: quote.adminAmountMicros,
              nonce: (nonce + 1n).toString(),
              deadline: deadline.toString(),
              signature: adminSignature.signature,
            },
          ],
        }),
      });
      const confirmResult = await confirmResponse.json();
      if (!confirmResponse.ok) {
        throw new Error(confirmResult.error || "Failed to confirm checkout");
      }

      pushLog("Checkout confirmed on-chain and recorded in the store ledger.", "success");
      if (confirmResult.inventoryWarning) {
        pushLog(confirmResult.inventoryWarning, "error");
      }
      setReceipt({ txHash: confirmResult.txHash, orderId: confirmResult.order.id });
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

  const handleAgentRun = async () => {
    setManagerBusy(true);
    setManagerError(null);
    setAgentFeedback(null);
    try {
      const response = await fetch(`/api/stores/${store.id}/agent/runs/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggerSource: "detail_page_manual" }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to run store agent");
      }
      setAgentFeedback({
        state: result.run?.state || "submitted",
        summary: result.run?.decision_summary || "Agent run completed.",
        actionCount: result.actions?.length || 0,
        validationStatus: result.run ? "pending" : undefined,
      });
    } catch (error) {
      setManagerError(error instanceof Error ? error.message : "Failed to run store agent");
    } finally {
      setManagerBusy(false);
    }
  };

  const handleCreateAgent = async () => {
    setManagerBusy(true);
    setManagerError(null);
    try {
      const response = await fetch(`/api/stores/${store.id}/agent/create`, {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to create store agent");
      }
      window.location.reload();
    } catch (error) {
      setManagerError(error instanceof Error ? error.message : "Failed to create store agent");
    } finally {
      setManagerBusy(false);
    }
  };

  const handleAgentPause = async (status: "active" | "paused") => {
    setManagerBusy(true);
    setManagerError(null);
    try {
      const response = await fetch(`/api/stores/${store.id}/agent/pause`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to update agent state");
      }
      window.location.reload();
    } catch (error) {
      setManagerError(error instanceof Error ? error.message : "Failed to update agent state");
    } finally {
      setManagerBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 pb-24 md:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_30%),linear-gradient(145deg,#171717_0%,#0b0b0b_100%)] p-6 shadow-2xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
              <Store className="h-3.5 w-3.5" />
              {store.network?.event_name || "Retail Network"}
            </div>
            <h1 className="mt-4 text-4xl font-black text-white">{store.stall_name}</h1>
            <p className="mt-3 max-w-2xl text-white/70">
              {store.stall_description || "Split checkout between store manager and admin."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-white/50">Manager Split</div>
              <div className="mt-2 text-2xl font-black text-white">{store.split_percentage}%</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-white/50">Items</div>
              <div className="mt-2 text-2xl font-black text-white">{store.items.length}</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-white/50">Agent</div>
              <div className="mt-2 text-xl font-black capitalize text-white">
                {store.manager_agent?.status || "missing"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Catalog</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {store.items.map(item => {
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
                        onClick={() => updateQuantity(item.id, selected - 1)}
                        disabled={selected === 0 || disabled}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{selected}</span>
                      <button
                        className="btn btn-circle btn-sm btn-ghost"
                        onClick={() => updateQuantity(item.id, selected + 1)}
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

          {canManage && (
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
                    onChange={e => setItemForm(prev => ({ ...prev, sku: e.target.value }))}
                    className="input input-bordered"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm text-base-content/60">Name</span>
                  <input
                    value={itemForm.name}
                    onChange={e => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                    className="input input-bordered"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm text-base-content/60">Price</span>
                  <input
                    value={itemForm.price}
                    onChange={e => setItemForm(prev => ({ ...prev, price: e.target.value }))}
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
                    onChange={e => setItemForm(prev => ({ ...prev, stock: e.target.value }))}
                    className="input input-bordered"
                    type="number"
                    min="0"
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button className="btn btn-primary" onClick={handleAddItem} disabled={managerBusy}>
                  Add Item
                </button>
                {!store.manager_agent ? (
                  <button className="btn btn-outline" onClick={handleCreateAgent} disabled={managerBusy}>
                    Add Agent
                  </button>
                ) : (
                  <>
                    <button className="btn btn-outline" onClick={handleAgentRun} disabled={managerBusy}>
                      Run Agent
                    </button>
                    {store.manager_agent.status === "paused" ? (
                      <button
                        className="btn btn-outline"
                        onClick={() => handleAgentPause("active")}
                        disabled={managerBusy}
                      >
                        Resume Agent
                      </button>
                    ) : (
                      <button
                        className="btn btn-outline"
                        onClick={() => handleAgentPause("paused")}
                        disabled={managerBusy}
                      >
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
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-base-200/60 p-5">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Checkout</h2>
            </div>

            <div className="mt-4 space-y-3">
              {cart.length ? (
                cart.map(line => (
                  <div
                    key={line.itemId}
                    className="flex items-center justify-between rounded-2xl bg-base-100/80 px-4 py-3"
                  >
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

            <button
              className="btn btn-primary mt-4 w-full"
              onClick={handleCheckout}
              disabled={checkoutBusy || cart.length === 0}
            >
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

          <div className="rounded-3xl border border-white/10 bg-base-200/60 p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Checkout Log</h2>
            </div>
            <div className="mt-4 space-y-3 font-mono text-xs">
              {logs.length ? (
                logs.map((log, index) => (
                  <div key={`${log.time}-${index}`} className="rounded-2xl bg-base-100/80 px-4 py-3">
                    <div className="text-base-content/40">{log.time}</div>
                    <div
                      className={
                        log.tone === "success"
                          ? "text-success"
                          : log.tone === "error"
                            ? "text-error"
                            : "text-base-content/80"
                      }
                    >
                      {log.message}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-base-content/55">
                  Structured checkout logs appear here as the flow executes.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
