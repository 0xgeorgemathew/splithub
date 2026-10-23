import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { usePrivy } from "@privy-io/react-auth";
import { ArrowDownToLine, Coins, MapPin, Pause, Play, Plus, RotateCcw, Store, Trash2 } from "lucide-react";
import { type Address, formatUnits } from "viem";
import { TOKENS, TOKEN_DECIMALS } from "~~/config/tokens";
import { useVenueCredits } from "~~/hooks/useVenueCredits";
import { apiFetch } from "~~/lib/apiFetch";
import { createFreshBaseSepoliaPublicClient } from "~~/lib/baseSepolia";
import { ERC20_ABI } from "~~/lib/contractAbis";
import { supabase } from "~~/lib/supabase";
import type { Venue, VenueCreditActivity, VenueStall } from "~~/lib/venue.types";
import {
  VENUE_CREDITS_ADDRESS,
  type VenueChainState,
  formatCredits,
  getCreditBalance,
  getVenueChainState,
} from "~~/lib/venueCredits";
import { type VenueTotals, getVenueActivity, getVenueBySlug, getVenueTotals } from "~~/services/venueService";
import { formatWalletError } from "~~/utils/errorFormatting";

const usdc = (units: bigint) => Number(formatUnits(units, TOKEN_DECIMALS.USDC)).toFixed(2);
const cr = (credits: number) => `${Number.isInteger(credits) ? credits : credits.toFixed(2)} CR`;
const short = (wallet: string) => `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;

async function send(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
  const response = await apiFetch(url, { method, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Request failed");
  return result;
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-base-200/50 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-base-100/70 px-4 py-3">
      <div className="text-xs text-base-content/50">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

/** The signed-in guest's credits at this venue, with the one-time USDC approval if it is missing. */
function GuestCredits({ venue, wallet, refreshKey }: { venue: Venue; wallet: string; refreshKey: number }) {
  const { enableCredits } = useVenueCredits();
  const [balance, setBalance] = useState<number | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!venue.chain_venue_id) return;
    const client = createFreshBaseSepoliaPublicClient();
    const [units, allowance] = await Promise.all([
      getCreditBalance(client, venue.chain_venue_id, wallet as Address),
      client.readContract({
        address: TOKENS.USDC,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [wallet as Address, VENUE_CREDITS_ADDRESS],
      }),
    ]);
    setBalance(formatCredits(units));
    setEnabled((allowance as bigint) > 0n);
  }, [venue.chain_venue_id, wallet]);

  useEffect(() => {
    load().catch(() => setBalance(null));
  }, [load, refreshKey]);

  if (!venue.chain_venue_id) return null;

  const enable = async () => {
    setBusy(true);
    setError(null);
    try {
      await enableCredits();
      await load();
    } catch (err) {
      setError(formatWalletError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-primary/70">Your credits here</div>
          <div className="mt-1 text-3xl font-black">{balance === null ? "…" : cr(balance)}</div>
        </div>
        {enabled ? (
          <Link
            to="/venues/$venueSlug/topup"
            params={{ venueSlug: venue.venue_slug }}
            className="btn btn-primary btn-sm"
          >
            <Coins className="h-4 w-4" /> Top up
          </Link>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={enable} disabled={busy}>
            {busy ? "Enabling..." : "Enable venue credits"}
          </button>
        )}
      </div>
      {!enabled && (
        <p className="mt-3 text-xs text-base-content/60">
          One approval lets venues pull USDC from your wallet when you tap to top up. Your chip still has to sign every
          top-up.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-error">{error}</p>}
    </div>
  );
}

function ActivityFeed({ activity }: { activity: VenueCreditActivity[] }) {
  if (!activity.length) return <p className="text-sm text-base-content/50">No top-ups or spends yet.</p>;
  return (
    <ul className="divide-y divide-white/5">
      {activity.map(row => (
        <li key={row.id} className="flex items-center justify-between gap-3 py-2 text-sm">
          <div className="min-w-0">
            <span className="font-medium">{row.guest_user?.name || short(row.guest_wallet)}</span>{" "}
            <span className="text-base-content/60">
              {row.kind === "topup"
                ? `topped up $${(row.usdc_amount ?? 0).toFixed(2)}`
                : row.kind === "spend"
                  ? `spent at ${row.stall?.stall_name ?? "a stall"}`
                  : "was refunded"}
            </span>
          </div>
          <span className={row.kind === "spend" ? "text-base-content" : "text-success"}>
            {row.kind === "spend" ? "−" : row.kind === "topup" ? "+" : "↩"}
            {cr(row.credits)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function StallForm({ venueId, onSaved }: { venueId: number; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await send(`/api/venues/${venueId}/stalls`, "POST", { stall_name: name, credit_price: price });
      setName("");
      setPrice("");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add stall");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
      <input
        className="input input-bordered input-sm flex-1"
        placeholder="Stall name (Laser Tag)"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <input
        className="input input-bordered input-sm sm:w-40"
        placeholder="Price in credits"
        inputMode="decimal"
        value={price}
        onChange={e => setPrice(e.target.value)}
      />
      <button className="btn btn-primary btn-sm" onClick={submit} disabled={busy || !name.trim()}>
        <Plus className="h-4 w-4" /> Add stall
      </button>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}

function OwnerPanel({
  venue,
  totals,
  onChange,
}: {
  venue: Venue;
  totals: VenueTotals | null;
  onChange: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const { ownerWrite, recordTx } = useVenueCredits();
  const [chain, setChain] = useState<VenueChainState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!venue.chain_venue_id) return;
    getVenueChainState(createFreshBaseSepoliaPublicClient(), venue.chain_venue_id)
      .then(setChain)
      .catch(() => setChain(null));
  }, [venue.chain_venue_id, totals]);

  const run = async (label: string, action: () => Promise<unknown>) => {
    setBusy(label);
    setError(null);
    try {
      await action();
      await onChange();
    } catch (err) {
      setError(err instanceof Error && !("shortMessage" in err) ? err.message : formatWalletError(err));
    } finally {
      setBusy(null);
    }
  };

  const chainId = venue.chain_venue_id ? BigInt(venue.chain_venue_id) : null;

  const register = () =>
    run("register", async () => {
      const txHash = await ownerWrite({ functionName: "createVenue", args: [] });
      await send(`/api/venues/${venue.id}/register`, "POST", { txHash });
    });

  const toggleOpen = () =>
    run("toggle", async () => {
      const open = venue.status !== "active";
      if (chainId) await ownerWrite({ functionName: "setVenueOpen", args: [chainId, open] });
      await send(`/api/venues/${venue.id}`, "PATCH", { status: open ? "active" : "paused" });
    });

  const withdraw = () =>
    run("withdraw", () => ownerWrite({ functionName: "withdraw", args: [chainId!, venue.owner_wallet as Address] }));

  const refund = (guest: string) =>
    run(`refund-${guest}`, async () => {
      const txHash = await ownerWrite({ functionName: "refundCredits", args: [chainId!, guest as Address] });
      await recordTx(txHash);
    });

  const deleteVenue = () =>
    run("delete", async () => {
      if (!window.confirm(`Delete ${venue.venue_name}? Guests keep their on-chain credits until you refund them.`)) {
        return;
      }
      await send(`/api/venues/${venue.id}`, "DELETE");
      await navigate({ to: "/venues" });
    });

  const updateStall = (stall: VenueStall, updates: Partial<VenueStall>) =>
    run(`stall-${stall.id}`, () => send(`/api/venues/stalls/${stall.id}`, "PATCH", updates));
  const deleteStall = (stall: VenueStall) =>
    run(`stall-${stall.id}`, () => send(`/api/venues/stalls/${stall.id}`, "DELETE"));

  const guestsWithCredits = Object.entries(totals?.guestBalances ?? {}).filter(([, credits]) => credits > 0);

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{error}</div>
      )}

      {!venue.chain_venue_id ? (
        <Section title="Start taking credits">
          <p className="text-sm text-base-content/60">
            This venue was set up before venue credits. Register it on-chain (one transaction from your wallet) so
            guests can top up and spend here.
          </p>
          <button className="btn btn-primary btn-sm mt-4" onClick={register} disabled={!!busy}>
            {busy === "register" ? "Registering..." : "Register venue"}
          </button>
        </Section>
      ) : (
        <Section
          title="Venue money"
          action={
            <button className="btn btn-ghost btn-sm" onClick={toggleOpen} disabled={!!busy}>
              {venue.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {busy === "toggle" ? "Saving..." : venue.status === "active" ? "Close venue" : "Open venue"}
            </button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="USDC held" value={chain ? `$${usdc(chain.usdcBalance)}` : "…"} />
            <Stat label="Withdrawable" value={chain ? `$${usdc(chain.withdrawable)}` : "…"} />
            <Stat label="Unspent credits" value={chain ? cr(formatCredits(chain.creditsOutstanding)) : "…"} />
            <Stat label="Guests" value={totals?.guests ?? "…"} />
          </div>
          <p className="mt-3 text-xs text-base-content/50">
            You can withdraw the USDC that guests have spent. Unspent credits stay backed so you can always refund them.
          </p>
          <button
            className="btn btn-primary btn-sm mt-4"
            onClick={withdraw}
            disabled={!!busy || !chain || chain.withdrawable === 0n}
          >
            <ArrowDownToLine className="h-4 w-4" />
            {busy === "withdraw" ? "Withdrawing..." : "Withdraw to my wallet"}
          </button>
        </Section>
      )}

      <Section title="Manage stalls">
        <ul className="divide-y divide-white/5">
          {(venue.venue_stalls ?? []).map(stall => (
            <li key={stall.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <div>
                <span className="font-medium">{stall.stall_name}</span>{" "}
                <span className="text-base-content/50">
                  {stall.credit_price ? cr(stall.credit_price) : "any amount"} ·{" "}
                  {cr(totals?.spentByStall[stall.id] ?? 0)} spent
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  className="btn btn-ghost btn-xs"
                  disabled={!!busy}
                  onClick={() => {
                    const value = window.prompt(
                      "Price in credits (leave empty for any amount)",
                      String(stall.credit_price ?? ""),
                    );
                    if (value !== null) void updateStall(stall, { credit_price: value === "" ? null : Number(value) });
                  }}
                >
                  Price
                </button>
                <button
                  className="btn btn-ghost btn-xs"
                  disabled={!!busy}
                  onClick={() => updateStall(stall, { status: stall.status === "active" ? "paused" : "active" })}
                >
                  {stall.status === "active" ? "Pause" : "Resume"}
                </button>
                <button
                  className="btn btn-ghost btn-xs text-error"
                  disabled={!!busy}
                  onClick={() => deleteStall(stall)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
        <StallForm venueId={venue.id} onSaved={() => void onChange()} />
      </Section>

      {guestsWithCredits.length > 0 && chainId && (
        <Section title="Refund unspent credits">
          <ul className="divide-y divide-white/5">
            {guestsWithCredits.map(([guest, credits]) => (
              <li key={guest} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span>
                  {short(guest)} · <span className="text-base-content/60">{cr(credits)}</span>
                </span>
                <button className="btn btn-ghost btn-xs" disabled={!!busy} onClick={() => refund(guest)}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  {busy === `refund-${guest}` ? "Refunding..." : "Refund"}
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <button className="btn btn-ghost btn-sm text-error" onClick={deleteVenue} disabled={!!busy}>
        <Trash2 className="h-4 w-4" /> Delete venue
      </button>
    </div>
  );
}

export function VenuePage({ venue: initialVenue }: { venue: Venue }) {
  const { authenticated, user } = usePrivy();
  const wallet = authenticated ? user?.wallet?.address?.toLowerCase() : undefined;
  const [venue, setVenue] = useState(initialVenue);
  const [activity, setActivity] = useState<VenueCreditActivity[]>([]);
  const [totals, setTotals] = useState<VenueTotals | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const isOwner = !!wallet && wallet === venue.owner_wallet.toLowerCase();

  const refresh = useCallback(async () => {
    const [fresh, recent, sums] = await Promise.all([
      getVenueBySlug(venue.venue_slug),
      getVenueActivity(venue.id, 30),
      getVenueTotals(venue.id),
    ]);
    if (fresh) setVenue(fresh);
    setActivity(recent);
    setTotals(sums);
    setRefreshKey(key => key + 1);
  }, [venue.id, venue.venue_slug]);

  useEffect(() => {
    void refresh();
    const channel = supabase
      .channel(`venue_activity_${venue.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "venue_credit_activity", filter: `venue_id=eq.${venue.id}` },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh, venue.id]);

  const stalls = useMemo(
    () => (venue.venue_stalls ?? []).filter(stall => isOwner || stall.status === "active"),
    [venue.venue_stalls, isOwner],
  );
  const takingCredits = !!venue.chain_venue_id && venue.status === "active";

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-4 pb-24 md:px-6">
      <Link to="/venues" className="text-xs font-medium tracking-wide text-base-content/50 hover:text-primary">
        &larr; VENUES
      </Link>

      <header className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_35%),linear-gradient(145deg,#171717_0%,#0b0b0b_100%)] p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          <MapPin className="h-3.5 w-3.5" />
          {takingCredits ? "Open · venue credits" : venue.chain_venue_id ? "Closed" : "Not taking credits yet"}
        </div>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-white">{venue.venue_name}</h1>
        {venue.venue_description && <p className="mt-2 max-w-2xl text-white/70">{venue.venue_description}</p>}
        {venue.owner_user?.name && <p className="mt-2 text-sm text-white/50">Run by {venue.owner_user.name}</p>}
        {takingCredits && (
          <Link
            to="/venues/$venueSlug/topup"
            params={{ venueSlug: venue.venue_slug }}
            className="btn btn-primary btn-sm mt-5"
          >
            <Coins className="h-4 w-4" /> Open top-up terminal
          </Link>
        )}
      </header>

      {wallet && !isOwner && <GuestCredits venue={venue} wallet={wallet} refreshKey={refreshKey} />}

      <Section title="Stalls">
        {stalls.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {stalls.map(stall => (
              <div key={stall.id} className="rounded-2xl bg-base-100/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{stall.stall_name}</div>
                    <div className="text-sm text-base-content/60">
                      {stall.credit_price ? cr(stall.credit_price) : "Pay any amount"}
                      {stall.status !== "active" && " · paused"}
                    </div>
                  </div>
                  <Store className="h-5 w-5 text-primary" />
                </div>
                {takingCredits && stall.status === "active" && (
                  <Link
                    to="/venues/$venueSlug/$stallSlug"
                    params={{ venueSlug: venue.venue_slug, stallSlug: stall.stall_slug }}
                    className="btn btn-outline btn-xs mt-3"
                  >
                    Open terminal
                  </Link>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-base-content/50">No stalls yet.</p>
        )}
      </Section>

      {isOwner && <OwnerPanel venue={venue} totals={totals} onChange={refresh} />}

      <Section title="Live activity">
        <ActivityFeed activity={activity} />
      </Section>
    </div>
  );
}
