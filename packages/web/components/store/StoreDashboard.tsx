import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CreateStoreModal } from "./CreateStoreModal";
import { usePrivy } from "@privy-io/react-auth";
import { Package, Plus, Shield, Store as StoreIcon, Wallet } from "lucide-react";
import { LOW_STOCK_THRESHOLD, type StoreDashboardData, type StoreWithCatalog } from "~~/lib/store.types";

const StoreCard = ({ store, showOwnerStats }: { store: StoreWithCatalog; showOwnerStats?: boolean }) => {
  const onSale = store.items.filter(item => item.status === "active");
  const lowStockCount = onSale.filter(item => item.stock <= LOW_STOCK_THRESHOLD).length;

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-base-200/80 to-base-300/60 p-5 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-primary/70">
            {store.status === "active" ? "Open" : "Paused"}
            {store.owner_user?.name ? ` · ${store.owner_user.name}` : ""}
          </p>
          <h3 className="mt-2 text-xl font-bold text-base-content">{store.store_name}</h3>
          <p className="mt-1 text-sm text-base-content/60">{store.store_description || "Tap-to-pay store"}</p>
        </div>
        <div className="rounded-2xl bg-primary/10 p-3 text-primary">
          <StoreIcon className="h-5 w-5" />
        </div>
      </div>

      <div className={`mt-4 grid gap-3 text-sm ${showOwnerStats ? "grid-cols-2" : "grid-cols-1"}`}>
        <div className="rounded-2xl bg-base-100/70 px-3 py-2">
          <div className="text-base-content/50">Items</div>
          <div className="mt-1 font-semibold">{onSale.length}</div>
        </div>
        {showOwnerStats && (
          <div className="rounded-2xl bg-base-100/70 px-3 py-2">
            <div className="text-base-content/50">Low stock</div>
            <div className="mt-1 font-semibold">{lowStockCount}</div>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link to="/store/$storeSlug" params={{ storeSlug: store.store_slug }} className="btn btn-primary btn-sm">
          Open Store
        </Link>
      </div>
    </div>
  );
};

export function StoreDashboard() {
  const { ready, authenticated, user, login } = usePrivy();
  const wallet = authenticated ? user?.wallet?.address : undefined;
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [data, setData] = useState<StoreDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/stores/dashboard${wallet ? `?wallet=${wallet}` : ""}`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to load stores");
      }
      setData(result);
    } catch (dashboardError) {
      setError(dashboardError instanceof Error ? dashboardError.message : "Failed to load stores");
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    if (ready) void fetchDashboard();
  }, [ready, fetchDashboard]);

  const handleStoreCreated = async () => {
    setNotice("Store created. Add catalog items from the store page to start selling.");
    await fetchDashboard();
  };

  const myStores = data?.myStores ?? [];
  const ownIds = new Set(myStores.map(store => store.id));
  const browse = (data?.publicStores ?? []).filter(store => !ownIds.has(store.id));

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 pb-24 md:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,153,221,0.18),transparent_35%),linear-gradient(145deg,#171717_0%,#0b0b0b_100%)] p-6 shadow-2xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              <StoreIcon className="h-3.5 w-3.5" />
              Stores
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white">Set up a store. Tap to pay.</h1>
            <p className="mt-3 max-w-xl text-base text-white/70">
              Name your store, add items and stock, and take payments with a chip tap. Buyers pay straight from their
              wallet to yours; nothing is parked on the chip.
            </p>
          </div>
          <div className="flex gap-3">
            {wallet ? (
              <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Create Store
              </button>
            ) : (
              <button className="btn btn-primary" onClick={login} disabled={!ready}>
                <Wallet className="h-4 w-4" />
                Sign in to set up a store
              </button>
            )}
          </div>
        </div>

        <div className={`mt-6 grid gap-4 ${wallet ? "md:grid-cols-3" : "md:grid-cols-1"}`}>
          {[
            { label: "Open Stores", value: data?.publicStores.length ?? 0, icon: StoreIcon, show: true },
            { label: "Your Stores", value: myStores.length, icon: Shield, show: Boolean(wallet) },
            {
              label: "Your Items On Sale",
              value: myStores.reduce((sum, store) => sum + store.items.filter(i => i.status === "active").length, 0),
              icon: Package,
              show: Boolean(wallet),
            },
          ]
            .filter(metric => metric.show)
            .map(metric => (
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
          {wallet && (
            <section className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Your Stores</h2>
                <span className="text-sm text-base-content/50">Payments go to your wallet</span>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {myStores.length ? (
                  myStores.map(store => <StoreCard key={store.id} store={store} showOwnerStats />)
                ) : (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-base-200/40 p-6 text-sm text-base-content/55">
                    You haven&apos;t set up a store yet. Create one, add your items, and start taking tap payments.
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="mt-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Browse Stores</h2>
              <span className="text-sm text-base-content/50">Open now · tap to pay</span>
            </div>
            {browse.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {browse.map(store => (
                  <StoreCard key={store.id} store={store} />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-white/10 bg-base-200/40 p-6 text-sm text-base-content/55">
                No other stores are open right now.
              </div>
            )}
          </section>
        </>
      )}

      {wallet && (
        <CreateStoreModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={handleStoreCreated} />
      )}
    </div>
  );
}
