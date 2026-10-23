-- Stores get their own table. A store is owned by one wallet (the person who set it up) and shoppers pay that
-- wallet directly. Before this, a store was a `stalls` row inside an `events` row with kind = 'store_network',
-- with a separate manager wallet and a manager/admin split recorded on each order.
--
-- 1. Create `stores` and move every store stall into it, keeping the stall id as the store id so items and
--    orders keep pointing at the same store. The owner is the store network's owner_wallet.
-- 2. Rebuild `store_items` (store_id, stock count folded in from store_inventory; status active|paused),
--    `store_orders` (store_id; manager_amount/admin_amount dropped) and `store_order_items` (rebuilt so its
--    foreign keys follow the new tables). SQLite needs table rebuilds to change foreign keys and columns.
-- 3. Delete the store_network events (their stalls cascade). The events.kind column stays.
--
-- D1 always enforces foreign keys and DROP TABLE runs an implicit DELETE that fires ON DELETE CASCADE, so the
-- old tables are dropped child-first, after their rows are copied into the new tables.

CREATE TABLE stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  store_slug TEXT UNIQUE NOT NULL,
  store_description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Store slugs were unique per store network; they are now global, so a repeated slug gets the store id appended.
INSERT INTO stores (id, owner_wallet, store_name, store_slug, store_description, status, created_at, updated_at)
SELECT
  s.id,
  e.owner_wallet,
  s.stall_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM stalls s2 JOIN events e2 ON e2.id = s2.event_id
      WHERE e2.kind = 'store_network' AND s2.stall_slug = s.stall_slug AND s2.id < s.id
    ) THEN s.stall_slug || '-' || s.id
    ELSE s.stall_slug
  END,
  s.stall_description,
  CASE WHEN s.status = 'active' AND e.status = 'active' THEN 'active' ELSE 'paused' END,
  s.created_at,
  s.updated_at
FROM stalls s
JOIN events e ON e.id = s.event_id
WHERE e.kind = 'store_network';

CREATE INDEX idx_stores_owner_wallet ON stores(owner_wallet);
CREATE INDEX idx_stores_status ON stores(status);

CREATE TABLE store_items_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  image_url TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Sold-out items become active with zero stock; archived items become paused.
INSERT INTO store_items_new (id, store_id, name, description, price, stock, status, image_url, created_at, updated_at)
SELECT
  i.id,
  i.stall_id,
  i.name,
  i.description,
  i.price,
  COALESCE(inv.current_stock, 0),
  CASE WHEN i.status IN ('paused', 'archived') THEN 'paused' ELSE 'active' END,
  i.image_url,
  i.created_at,
  i.updated_at
FROM store_items i
LEFT JOIN store_inventory inv ON inv.item_id = i.id
WHERE i.stall_id IN (SELECT id FROM stores);

CREATE TABLE store_orders_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  buyer_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  subtotal REAL NOT NULL CHECK (subtotal >= 0),
  token_address TEXT NOT NULL,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT
);

INSERT INTO store_orders_new (id, store_id, buyer_wallet, subtotal, token_address, tx_hash, status, created_at, completed_at)
SELECT id, stall_id, buyer_wallet, subtotal, token_address, tx_hash, status, created_at, completed_at
FROM store_orders
WHERE stall_id IN (SELECT id FROM stores);

CREATE TABLE store_order_items_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES store_orders_new(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES store_items_new(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price REAL NOT NULL CHECK (unit_price >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO store_order_items_new (id, order_id, item_id, quantity, unit_price, created_at)
SELECT id, order_id, item_id, quantity, unit_price, created_at
FROM store_order_items
WHERE order_id IN (SELECT id FROM store_orders_new) AND item_id IN (SELECT id FROM store_items_new);

-- Drop the old tables child-first so no cascade reaches rows that were just copied.
DROP TABLE store_order_items;
DROP TABLE store_inventory;
DROP TABLE store_orders;
DROP TABLE store_items;

-- Renaming also rewrites the foreign keys in store_order_items_new to the final table names.
ALTER TABLE store_items_new RENAME TO store_items;
ALTER TABLE store_orders_new RENAME TO store_orders;
ALTER TABLE store_order_items_new RENAME TO store_order_items;

CREATE INDEX idx_store_items_store_id ON store_items(store_id);
CREATE INDEX idx_store_items_status ON store_items(status);
CREATE INDEX idx_store_orders_store_id ON store_orders(store_id);
CREATE INDEX idx_store_orders_buyer_wallet ON store_orders(buyer_wallet);
CREATE INDEX idx_store_orders_status ON store_orders(status);
CREATE UNIQUE INDEX idx_store_orders_tx_hash_unique ON store_orders(tx_hash) WHERE tx_hash IS NOT NULL;
CREATE INDEX idx_store_order_items_order_id ON store_order_items(order_id);
CREATE INDEX idx_store_order_items_item_id ON store_order_items(item_id);

-- Store networks and their stalls are no longer used (stalls and their stall_payments cascade).
DELETE FROM events WHERE kind = 'store_network';
