import { Store } from "lucide-react";
import type { StoreWithCatalog } from "~~/lib/store.types";

export function StoreHero({ store }: { store: StoreWithCatalog }) {
  return (
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
  );
}
