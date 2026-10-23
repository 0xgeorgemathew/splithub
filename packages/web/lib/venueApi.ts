import { apiFetch } from "~~/lib/apiFetch";
import type { Event, Stall } from "~~/lib/events.types";

async function send(url: string, method: "PATCH" | "DELETE", body?: unknown) {
  const response = await apiFetch(url, { method, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Request failed");
  return result;
}

/** Venue owner actions; the server checks that the signed-in user owns the venue. */
export const venueApi = {
  updateVenue: (eventId: number, updates: Partial<Event>) => send(`/api/events/${eventId}`, "PATCH", updates),
  deleteVenue: (eventId: number) => send(`/api/events/${eventId}`, "DELETE"),
  updateStall: (stallId: number, updates: Partial<Stall>) => send(`/api/events/stalls/${stallId}`, "PATCH", updates),
  deleteStall: (stallId: number) => send(`/api/events/stalls/${stallId}`, "DELETE"),
};
