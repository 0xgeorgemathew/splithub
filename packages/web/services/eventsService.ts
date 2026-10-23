import type {
  CreateEventData,
  CreateStallData,
  CreateStallPaymentData,
  Event,
  Stall,
  StallPayment,
} from "~~/lib/events.types";
import { supabase } from "~~/lib/supabase";

// ============================================================================
// EVENTS
// ============================================================================

/**
 * Create a new event
 */
export async function createEvent(data: CreateEventData): Promise<Event> {
  const { data: event, error } = await supabase
    .from("events")
    .insert(data)
    .select(
      `
      *,
      owner_user:users!owner_wallet(name, twitter_handle, twitter_profile_url)
    `,
    )
    .single();

  if (error) throw new Error(`Failed to create event: ${error.message}`);
  return event as Event;
}

/**
 * Get events by owner
 */
export async function getEventsByOwner(ownerWallet: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from("events")
    .select(
      `
      *,
      owner_user:users!owner_wallet(name, twitter_handle, twitter_profile_url),
      stalls(*)
    `,
    )
    .eq("owner_wallet", ownerWallet.toLowerCase())
    .eq("kind", "venue")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch events: ${error.message}`);
  return (data || []) as Event[];
}

/**
 * Get event by slug (for public pages)
 */
export async function getEventBySlug(slug: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from("events")
    .select(
      `
      *,
      owner_user:users!owner_wallet(name, twitter_handle, twitter_profile_url),
      stalls(
        *,
        operator_user:users!operator_wallet(name, twitter_handle, twitter_profile_url)
      )
    `,
    )
    .eq("event_slug", slug)
    .single();

  if (error) return null;
  return data as Event;
}

/**
 * Get a venue by id (owner checks in API routes)
 */
export async function getEventById(eventId: number): Promise<Event | null> {
  const { data } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
  return (data as Event) || null;
}

/**
 * Get a stall with its event (owner checks in API routes)
 */
export async function getStallWithEvent(stallId: number): Promise<(Stall & { event: Event }) | null> {
  const { data } = await supabase.from("stalls").select("*, event:events!event_id(*)").eq("id", stallId).maybeSingle();
  return (data as Stall & { event: Event }) || null;
}

/**
 * Update event
 */
export async function updateEvent(eventId: number, updates: Partial<Event>): Promise<Event> {
  const { data, error } = await supabase.from("events").update(updates).eq("id", eventId).select("*").single();

  if (error) throw new Error(`Failed to update event: ${error.message}`);
  return data as Event;
}

/**
 * Delete event (and associated stalls via cascade)
 */
export async function deleteEvent(eventId: number): Promise<void> {
  const { error } = await supabase.from("events").delete().eq("id", eventId);

  if (error) throw new Error(`Failed to delete event: ${error.message}`);
}

// ============================================================================
// STALLS
// ============================================================================

/**
 * Look up a stall operator by wallet. Payments go to this wallet, so operators are chosen by wallet,
 * never by Twitter handle (handles are self-reported and not unique).
 */
export async function getOperatorByWallet(wallet: string) {
  const { data } = await supabase
    .from("users")
    .select("wallet_address, twitter_handle, name")
    .eq("wallet_address", wallet.toLowerCase())
    .maybeSingle();
  return (data as { wallet_address: string; twitter_handle: string | null; name: string } | null) ?? null;
}

/**
 * Create a new stall
 */
export async function createStall(data: CreateStallData): Promise<Stall> {
  const operator = await getOperatorByWallet(data.operator_wallet);
  if (!operator) throw new Error("Stall operator must be a SplitHub user");

  const stallData = {
    ...data,
    operator_wallet: operator.wallet_address,
    operator_twitter_handle: operator.twitter_handle || operator.name,
  };

  const { data: stall, error } = await supabase.from("stalls").insert(stallData).select("*").single();

  if (error) throw new Error(`Failed to create stall: ${error.message}`);
  return stall as Stall;
}

/**
 * Get stalls by event
 */
export async function getStallsByEvent(eventId: number): Promise<Stall[]> {
  const { data, error } = await supabase
    .from("stalls")
    .select(
      `
      *,
      operator_user:users!operator_wallet(name, twitter_handle, twitter_profile_url)
    `,
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch stalls: ${error.message}`);
  return (data || []) as Stall[];
}

/**
 * Get stall by event slug and stall slug
 */
export async function getStallBySlug(eventSlug: string, stallSlug: string): Promise<Stall | null> {
  const { data, error } = await supabase
    .from("stalls")
    .select(
      `
      *,
      event:events!event_id!inner(*),
      operator_user:users!operator_wallet(name, twitter_handle, twitter_profile_url)
    `,
    )
    .eq("stall_slug", stallSlug)
    .eq("event.event_slug", eventSlug)
    .eq("event.kind", "venue")
    .single();

  if (error) return null;
  return data as Stall;
}

/**
 * Update stall
 */
export async function updateStall(stallId: number, updates: Partial<Stall>): Promise<Stall> {
  const { data, error } = await supabase.from("stalls").update(updates).eq("id", stallId).select("*").single();

  if (error) throw new Error(`Failed to update stall: ${error.message}`);
  return data as Stall;
}

/**
 * Delete stall
 */
export async function deleteStall(stallId: number): Promise<void> {
  const { error } = await supabase.from("stalls").delete().eq("id", stallId);

  if (error) throw new Error(`Failed to delete stall: ${error.message}`);
}

/**
 * Get stalls by operator wallet (for stall operators to see their stalls)
 */
export async function getStallsByOperator(operatorWallet: string): Promise<Stall[]> {
  const { data, error } = await supabase
    .from("stalls")
    .select(
      `
      *,
      event:events!event_id!inner(id, event_name, event_slug, owner_wallet, status, kind),
      operator_user:users!operator_wallet(name, twitter_handle, twitter_profile_url)
    `,
    )
    .eq("operator_wallet", operatorWallet.toLowerCase())
    .eq("event.kind", "venue")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch operator stalls: ${error.message}`);
  return (data || []) as Stall[];
}

// ============================================================================
// PAYMENTS
// ============================================================================

/**
 * Create a stall payment
 */
export async function createStallPayment(data: CreateStallPaymentData): Promise<StallPayment> {
  const { data: payment, error } = await supabase
    .from("stall_payments")
    .insert(data)
    .select(
      `
      *,
      payer_user:users!payer_wallet(name, twitter_handle, twitter_profile_url)
    `,
    )
    .single();

  if (error) throw new Error(`Failed to create payment: ${error.message}`);
  return payment as StallPayment;
}

/**
 * Get payments for a stall
 */
export async function getStallPayments(stallId: number, limit = 50): Promise<StallPayment[]> {
  const { data, error } = await supabase
    .from("stall_payments")
    .select(
      `
      *,
      payer_user:users!payer_wallet(name, twitter_handle, twitter_profile_url)
    `,
    )
    .eq("stall_id", stallId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch payments: ${error.message}`);
  return (data || []) as StallPayment[];
}

/**
 * Get stall statistics
 */
export async function getStallStats(stallId: number) {
  const { data, error } = await supabase
    .from("stall_payments")
    .select("amount, operator_amount, status")
    .eq("stall_id", stallId)
    .eq("status", "completed");

  if (error) throw new Error(`Failed to fetch stall stats: ${error.message}`);

  const totalAmount = data.reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);
  const operatorAmount = data.reduce((sum, payment) => sum + parseFloat(payment.operator_amount.toString()), 0);
  const transactionCount = data.length;

  return {
    totalAmount,
    operatorAmount,
    transactionCount,
  };
}
