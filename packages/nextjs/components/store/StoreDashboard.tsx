"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CreateStoreModal } from "./CreateStoreModal";
import { usePrivy } from "@privy-io/react-auth";
import { motion } from "framer-motion";
import {
  Bot,
  ChartNoAxesCombined,
  Plus,
  Shield,
  ShoppingBag,
  Sparkles,
  Store as StoreIcon,
  Wallet,
} from "lucide-react";
import type { StoreDashboardData, StoreWithCatalog } from "~~/lib/store.types";

const formatUsd = (value: number) => `$${value.toFixed(2)}`;

const StoreCard = ({
  store,
  actionLabel,
  href,
  onAgentAction,
  onCreateAgent,
  agentBusy,
}: {
  store: StoreWithCatalog;
  actionLabel?: string;
  href: string;
  onAgentAction?: () => void;
  onCreateAgent?: () => void;
  agentBusy?: boolean;
}) => {
  const lowStockCount = store.items.filter(
    item => item.inventory && item.inventory.current_stock <= item.inventory.reorder_threshold,
  ).length;

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-base-200/80 to-base-300/60 p-5 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-primary/70">
            {store.network?.event_name || "Retail Network"}
          </p>
          <h3 className="mt-2 text-xl font-bold text-base-content">{store.stall_name}</h3>
          <p className="mt-1 text-sm text-base-content/60">
            {store.stall_description || "Autonomous store manager enabled"}
          </p>
        </div>
        <div className="rounded-2xl bg-primary/10 p-3 text-primary">
          <StoreIcon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-2xl bg-base-100/70 px-3 py-2">
          <div className="text-base-content/50">Items</div>
          <div className="mt-1 font-semibold">{store.items.length}</div>
        </div>
        <div className="rounded-2xl bg-base-100/70 px-3 py-2">
          <div className="text-base-content/50">Low stock</div>
          <div className="mt-1 font-semibold">{lowStockCount}</div>
        </div>
        <div className="rounded-2xl bg-base-100/70 px-3 py-2">
          <div className="text-base-content/50">Agent</div>
          <div className="mt-1 font-semibold capitalize">{store.manager_agent?.status || "missing"}</div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={href} className="btn btn-primary btn-sm">
          Open Store
        </Link>
        {!store.manager_agent && onCreateAgent && (
          <button className="btn btn-outline btn-sm" onClick={onCreateAgent} disabled={agentBusy}>
            {agentBusy ? "Adding..." : "Add Agent"}
          </button>
        )}
        {store.manager_agent && onAgentAction && (
          <button className="btn btn-outline btn-sm" onClick={onAgentAction} disabled={agentBusy}>
            {agentBusy ? "Running..." : actionLabel || "Run Agent"}
          </button>
        )}
      </div>
    </div>
  );
};

export function StoreDashboard() {
  const { ready, authenticated, user, login } = usePrivy();
  const wallet = user?.wallet?.address;
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [data, setData] = useState<StoreDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [agentActionStoreId, setAgentActionStoreId] = useState<number | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!wallet) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/stores/dashboard?wallet=${wallet}`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to load store dashboard");
      }
      setData(result);
    } catch (dashboardError) {
      setError(dashboardError instanceof Error ? dashboardError.message : "Failed to load store dashboard");
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    if (wallet) {
      void fetchDashboard();
    } else {
      setLoading(false);
    }
  }, [wallet, fetchDashboard]);

  const metrics = useMemo(() => {
    if (!data) {
      return {
        publicStores: 0,
        managedStores: 0,
        ownedNetworks: 0,
        recentOrders: 0,
      };
    }
    return {
      publicStores: data.publicStores.length,
      managedStores: data.managedStores.length,
      ownedNetworks: data.ownedNetworks.length,
      recentOrders: data.recentOrders.length,
    };
  }, [data]);

  const handleAgentTrigger = async (storeId: number) => {
    setAgentActionStoreId(storeId);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/stores/${storeId}/agent/runs/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggerSource: "dashboard_manual" }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Failed to queue store agent");
      }
      setNotice("Agent run queued. Refresh activity logs in a moment to see the completed run.");
      await fetchDashboard();
    } catch (agentError) {
      setError(agentError instanceof Error ? agentError.message : "Failed to queue store agent");
    } finally {
      setAgentActionStoreId(null);
    }
  };

  const handleCreateAgent = async (storeId: number) => {
    setAgentActionStoreId(storeId);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/stores/${storeId}/agent/create`, {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to create store agent");
      }
      setNotice("Store agent created. You can now queue autonomous runs for this store.");
      await fetchDashboard();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create store agent");
    } finally {
      setAgentActionStoreId(null);
    }
  };

  const handleStoreCreated = async () => {
    setNotice("Store created. Add catalog items from the store page to finish setup.");
    await fetchDashboard();
  };

  if (!ready) {
    return (
      <div className="min-h-[calc(100vh-160px)] flex items-center justify-center">
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            className="h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary/50" />
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated || !wallet) {
    return (
      <div className="flex min-h-[calc(100vh-160px)] items-center justify-center p-4">
        <div className="max-w-md rounded-3xl border border-white/10 bg-gradient-to-br from-base-200 to-base-300 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Wallet className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold">Connect to run the Store network</h2>
          <p className="mt-2 text-base-content/60">
            The same wallet can act as admin, manager, or shopper depending on the stores linked to it.
          </p>
          <button className="btn btn-primary mt-6" onClick={login}>
            Login with Twitter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 pb-24 md:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,153,221,0.18),transparent_35%),linear-gradient(145deg,#171717_0%,#0b0b0b_100%)] p-6 shadow-2xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              <Bot className="h-3.5 w-3.5" />
              Autonomous Store Network
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white">Stores that manage themselves</h1>
            <p className="mt-3 max-w-xl text-base text-white/70">
              Create stores, route checkout splits to manager and admin, and let per-store AI managers restock and
              monitor operations with structured execution logs.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Store
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            { label: "Public Stores", value: metrics.publicStores, icon: StoreIcon },
            { label: "Managed Stores", value: metrics.managedStores, icon: Shield },
            { label: "Admin Networks", value: metrics.ownedNetworks, icon: ChartNoAxesCombined },
            { label: "Recent Orders", value: metrics.recentOrders, icon: ShoppingBag },
          ].map(metric => (
            <div key={metric.label} className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <metric.icon className="h-5 w-5 text-primary" />
              <div className="mt-3 text-3xl font-black text-white">{metric.value}</div>
              <div className="text-sm text-white/60">{metric.label}</div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{error}</div>
      )}
      {notice && (
        <div className="mt-6 rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="mt-8 text-sm text-base-content/50">Loading store network…</div>
      ) : (
        <>
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Managed Stores</h2>
              <span className="text-sm text-base-content/50">Your wallet controls these store agents</span>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {data?.managedStores.length ? (
                data.managedStores.map(store => (
                  <StoreCard
                    key={store.id}
                    store={store}
                    href={`/store/${store.network?.event_slug}/${store.stall_slug}`}
                    onAgentAction={() => handleAgentTrigger(store.id)}
                    onCreateAgent={() => handleCreateAgent(store.id)}
                    agentBusy={agentActionStoreId === store.id}
                  />
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-white/10 bg-base-200/40 p-6 text-sm text-base-content/55">
                  No manager-assigned stores yet. Create one or assign this wallet as a store manager.
                </div>
              )}
            </div>
          </section>

        </>
      )}

      <CreateStoreModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        adminWallet={wallet}
        onCreated={handleStoreCreated}
      />
    </div>
  );
}
