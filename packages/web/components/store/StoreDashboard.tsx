import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CreateStoreModal } from "./CreateStoreModal";
import { usePrivy } from "@privy-io/react-auth";
import { motion } from "framer-motion";
import { ChartNoAxesCombined, Plus, Shield, ShoppingBag, Sparkles, Store as StoreIcon, Wallet } from "lucide-react";
import type { StoreDashboardData, StoreWithCatalog } from "~~/lib/store.types";

const StoreCard = ({ store, href }: { store: StoreWithCatalog; href: string }) => {
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
          <p className="mt-1 text-sm text-base-content/60">{store.stall_description || "Tap-to-pay store"}</p>
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
          <div className="text-base-content/50">Split</div>
          <div className="mt-1 font-semibold">{store.split_percentage}%</div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link to={href} className="btn btn-primary btn-sm">
          Open Store
        </Link>
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
          <h2 className="text-2xl font-bold">Sign in to set up a store</h2>
          <p className="mt-2 text-base-content/60">
            Create a store, add your catalog, and take tap payments straight into your wallet.
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
              <StoreIcon className="h-3.5 w-3.5" />
              Store Network
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white">Run a tap-to-pay store</h1>
            <p className="mt-3 max-w-xl text-base text-white/70">
              Create a store, add your catalog and stock, and take payments with a chip tap. Buyers pay straight from
              their wallet; nothing is parked on the chip.
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
            { label: "Your Stores", value: metrics.managedStores, icon: Shield },
            { label: "Store Groups", value: metrics.ownedNetworks, icon: ChartNoAxesCombined },
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
        <div className="mt-8 text-sm text-base-content/50">Loading stores…</div>
      ) : (
        <>
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Your Stores</h2>
              <span className="text-sm text-base-content/50">Stores you own or manage</span>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {data?.managedStores.length ? (
                data.managedStores.map(store => (
                  <StoreCard
                    key={store.id}
                    store={store}
                    href={`/store/${store.network?.event_slug}/${store.stall_slug}`}
                  />
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-white/10 bg-base-200/40 p-6 text-sm text-base-content/55">
                  You haven&apos;t set up a store yet. Create one, add your catalog, and start taking tap payments.
                </div>
              )}
            </div>
          </section>

          {(() => {
            const ownIds = new Set(data?.managedStores.map(store => store.id));
            const browse = (data?.publicStores ?? []).filter(store => !ownIds.has(store.id));
            if (!browse.length) return null;
            return (
              <section className="mt-10">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold">Browse Stores</h2>
                  <span className="text-sm text-base-content/50">Open now · tap to pay</span>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {browse.map(store => (
                    <StoreCard
                      key={store.id}
                      store={store}
                      href={`/store/${store.network?.event_slug}/${store.stall_slug}`}
                    />
                  ))}
                </div>
              </section>
            );
          })()}
        </>
      )}

      <CreateStoreModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        adminWallet={wallet}
        networks={data?.ownedNetworks ?? []}
        onCreated={handleStoreCreated}
      />
    </div>
  );
}
