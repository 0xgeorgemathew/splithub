"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StoreActivityLogCard } from "./StoreActivityLogCard";
import { StoreAgentGuardrailsCard } from "./StoreAgentGuardrailsCard";
import { StoreCatalogGrid } from "./StoreCatalogGrid";
import { StoreCheckoutPanel } from "./StoreCheckoutPanel";
import { StoreHero } from "./StoreHero";
import { StoreManagerControls } from "./StoreManagerControls";
import { StoreRecentAgentRunsCard } from "./StoreRecentAgentRunsCard";
import type { AgentFeedback, CheckoutLog, ItemFormState } from "./checkout/shared";
import { usePrivy } from "@privy-io/react-auth";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import deployedContracts from "~~/contracts/deployedContracts";
import { useHaloChip } from "~~/hooks/halochip-arx/useHaloChip";
import type { StoreWithCatalog } from "~~/lib/store.types";
import type { AgentRun, AgentValidation } from "~~/lib/supabase";

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
  const [recentAgentRuns, setRecentAgentRuns] = useState<AgentRun[]>([]);
  const [recentValidations, setRecentValidations] = useState<AgentValidation[]>([]);
  const [agentRunsLoading, setAgentRunsLoading] = useState(false);
  const [queuedRunRequestedAt, setQueuedRunRequestedAt] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormState>({
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

  const fetchAgentLogs = useCallback(async () => {
    if (!store.manager_agent?.id) return;

    setAgentRunsLoading(true);
    try {
      const response = await fetch(`/api/agents/${store.manager_agent.id}/logs`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch agent logs");
      }
      setRecentAgentRuns(result.runs || []);
      setRecentValidations(result.validations || []);
    } catch (error) {
      console.error("Failed to refresh agent logs:", error);
    } finally {
      setAgentRunsLoading(false);
    }
  }, [store.manager_agent?.id]);

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

  useEffect(() => {
    if (!store.manager_agent?.id) {
      setRecentAgentRuns([]);
      setRecentValidations([]);
      return;
    }

    void fetchAgentLogs();

    const interval = window.setInterval(
      () => {
        void fetchAgentLogs();
      },
      agentFeedback?.queued ? 3000 : 10000,
    );

    return () => window.clearInterval(interval);
  }, [agentFeedback?.queued, fetchAgentLogs, store.manager_agent?.id]);

  useEffect(() => {
    if (!agentFeedback?.queued || !queuedRunRequestedAt || recentAgentRuns.length === 0) {
      return;
    }

    const latestRun = recentAgentRuns[0];
    const latestRunStartedAt = Date.parse(latestRun.started_at);
    if (Number.isNaN(latestRunStartedAt) || latestRunStartedAt < queuedRunRequestedAt - 5000) {
      return;
    }

    const validation = recentValidations.find(candidate => candidate.agent_run_id === latestRun.id);
    const actionCount = Array.isArray(latestRun.output_json?.actions) ? latestRun.output_json.actions.length : 0;

    if (latestRun.state !== "submitted" && latestRun.state !== "failed") {
      setAgentFeedback({
        state: latestRun.state,
        summary:
          latestRun.decision_summary ||
          `The queued store agent run is now ${latestRun.state}. Recent runs below will keep refreshing automatically.`,
        actionCount: 0,
        validationStatus: validation?.status,
        queued: true,
      });
      return;
    }

    setAgentFeedback({
      state: latestRun.state,
      summary: latestRun.decision_summary || "Agent run completed.",
      actionCount,
      validationStatus: validation?.status,
      queued: false,
    });
    setQueuedRunRequestedAt(null);
  }, [agentFeedback?.queued, queuedRunRequestedAt, recentAgentRuns, recentValidations]);

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
      setQueuedRunRequestedAt(Date.now());
      setAgentFeedback({
        state: result.queued ? "queued" : result.run?.state || "submitted",
        summary: result.queued
          ? "The autonomous store run has been queued in Trigger.dev. Check agent activity or refresh in a moment for the completed run."
          : result.run?.decision_summary || "Agent run completed.",
        actionCount: result.queued ? 0 : result.actions?.length || 0,
        validationStatus: result.queued ? undefined : result.run ? "pending" : undefined,
        queued: Boolean(result.queued),
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
      <StoreHero store={store} />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <StoreCatalogGrid items={store.items} quantities={quantities} onUpdateQuantity={updateQuantity} />
          {canManage && (
            <StoreManagerControls
              store={store}
              itemForm={itemForm}
              onItemFormChange={setItemForm}
              managerBusy={managerBusy}
              managerError={managerError}
              agentFeedback={agentFeedback}
              onAddItem={handleAddItem}
              onCreateAgent={handleCreateAgent}
              onAgentRun={handleAgentRun}
              onAgentPause={handleAgentPause}
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
          <StoreAgentGuardrailsCard store={store} />
          {store.manager_agent && (
            <StoreRecentAgentRunsCard
              runs={recentAgentRuns}
              validations={recentValidations}
              loading={agentRunsLoading}
            />
          )}
          <StoreActivityLogCard logs={logs} />
        </div>
      </div>
    </div>
  );
}
