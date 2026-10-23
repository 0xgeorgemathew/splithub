-- Venues (events with stalls) and store networks (a store owner's group of stores) share the events table.
-- `kind` keeps them apart so venue dashboards and the public store list only show their own rows.
ALTER TABLE events ADD COLUMN kind TEXT NOT NULL DEFAULT 'venue' CHECK (kind IN ('venue', 'store_network'));

UPDATE events SET kind = 'store_network'
WHERE event_description LIKE '% retail network'
   OR id IN (SELECT s.event_id FROM stalls s JOIN store_items i ON i.stall_id = s.id);

CREATE INDEX idx_events_kind ON events(kind);
