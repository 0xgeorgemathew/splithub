import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dir, "../../migrations");
const files = readdirSync(dir).sort();
const apply = (sqlite: Database, file: string) => sqlite.exec(readFileSync(join(dir, file), "utf8"));

describe("0005_stores and 0006_venue_credits", () => {
  test("moves store stalls into stores and keeps items, stock and orders", () => {
    const sqlite = new Database(":memory:");
    sqlite.exec("PRAGMA foreign_keys = ON;");
    for (const file of files.filter(file => file < "0005")) apply(sqlite, file);

    sqlite.exec(`
      INSERT INTO users (wallet_address, name, privy_user_id) VALUES ('0xowner', 'Owner', 'did:o'), ('0xbuyer', 'Buyer', 'did:b');
      INSERT INTO events (id, event_name, event_slug, owner_wallet, kind, status)
        VALUES (1, 'My Stores', 'my-stores', '0xowner', 'store_network', 'active'),
               (2, 'Fest', 'fest', '0xowner', 'venue', 'active'),
               (3, 'Other Stores', 'other-stores', '0xowner', 'store_network', 'paused');
      INSERT INTO stalls (id, event_id, stall_name, stall_slug, operator_twitter_handle, operator_wallet, split_percentage, token_address)
        VALUES (7, 1, 'Coffee', 'coffee', 'x', '0xbuyer', 80, '0xusdc'),
               (8, 2, 'Food stall', 'food', 'x', '0xowner', 50, '0xusdc'),
               (9, 3, 'Coffee Two', 'coffee', 'x', '0xowner', 80, '0xusdc');
      INSERT INTO store_items (id, stall_id, sku, name, price, token_address, status)
        VALUES (11, 7, 'latte', 'Latte', 4.5, '0xusdc', 'active'),
               (12, 7, 'mocha', 'Mocha', 5, '0xusdc', 'out_of_stock'),
               (13, 9, 'tea', 'Tea', 3, '0xusdc', 'archived');
      INSERT INTO store_inventory (item_id, current_stock) VALUES (11, 6), (12, 0);
      INSERT INTO store_orders (id, stall_id, buyer_wallet, subtotal, manager_amount, admin_amount, token_address, tx_hash, status)
        VALUES (21, 7, '0xbuyer', 9, 7.2, 1.8, '0xusdc', '0xtx', 'completed');
      INSERT INTO store_order_items (id, order_id, item_id, quantity, unit_price) VALUES (31, 21, 11, 2, 4.5);
      INSERT INTO stall_payments (stall_id, event_id, payer_wallet, amount, token_address, operator_amount, owner_amount, tx_hash)
        VALUES (8, 2, '0xbuyer', 1, '0xusdc', 0.5, 0.5, '0xvenue');
    `);

    apply(sqlite, "0005_stores.sql");

    expect(
      sqlite.query("SELECT id, owner_wallet, store_name, store_slug, status FROM stores ORDER BY id").all(),
    ).toEqual([
      { id: 7, owner_wallet: "0xowner", store_name: "Coffee", store_slug: "coffee", status: "active" },
      { id: 9, owner_wallet: "0xowner", store_name: "Coffee Two", store_slug: "coffee-9", status: "paused" },
    ]);
    expect(sqlite.query("SELECT id, store_id, name, stock, status FROM store_items ORDER BY id").all()).toEqual([
      { id: 11, store_id: 7, name: "Latte", stock: 6, status: "active" },
      { id: 12, store_id: 7, name: "Mocha", stock: 0, status: "active" },
      { id: 13, store_id: 9, name: "Tea", stock: 0, status: "paused" },
    ]);
    expect(sqlite.query("SELECT id, store_id, subtotal, tx_hash FROM store_orders").all()).toEqual([
      { id: 21, store_id: 7, subtotal: 9, tx_hash: "0xtx" },
    ]);
    expect(sqlite.query("SELECT id, order_id, item_id, quantity FROM store_order_items").all()).toEqual([
      { id: 31, order_id: 21, item_id: 11, quantity: 2 },
    ]);

    // Store networks and their stalls are gone; venues keep theirs.
    expect(sqlite.query("SELECT id FROM events ORDER BY id").all()).toEqual([{ id: 2 }]);
    expect(sqlite.query("SELECT id FROM stalls").all()).toEqual([{ id: 8 }]);
    expect(sqlite.query("SELECT tx_hash FROM stall_payments").all()).toEqual([{ tx_hash: "0xvenue" }]);

    // Foreign keys point at the new tables and still hold; tx hashes stay unique.
    expect(sqlite.query("PRAGMA foreign_key_check").all()).toEqual([]);
    const fks = sqlite.query("PRAGMA foreign_key_list(store_order_items)").all() as { table: string }[];
    expect(fks.map(fk => fk.table).sort()).toEqual(["store_items", "store_orders"]);
    expect(() =>
      sqlite.exec(
        "INSERT INTO store_orders (store_id, buyer_wallet, subtotal, token_address, tx_hash) VALUES (7, '0xbuyer', 1, '0xusdc', '0xtx')",
      ),
    ).toThrow();

    // New stores continue after the moved ids.
    sqlite.exec("INSERT INTO stores (owner_wallet, store_name, store_slug) VALUES ('0xbuyer', 'New', 'new')");
    expect((sqlite.query("SELECT id FROM stores WHERE store_slug = 'new'").get() as { id: number }).id).toBe(10);

    // 0006: the remaining events become closed-loop venues; stalls keep their ids, USDC stall payments go.
    sqlite.exec(
      "INSERT INTO stalls (id, event_id, stall_name, stall_slug, operator_twitter_handle, split_percentage, token_address) VALUES (14, 2, 'Top Up', 'topup', 'x', 10, '0xusdc')",
    );
    apply(sqlite, "0006_venue_credits.sql");
    expect(
      sqlite.query("SELECT id, venue_name, venue_slug, owner_wallet, status, chain_venue_id FROM venues").all(),
    ).toEqual([
      {
        id: 2,
        venue_name: "Fest",
        venue_slug: "fest",
        owner_wallet: "0xowner",
        status: "active",
        chain_venue_id: null,
      },
    ]);
    expect(sqlite.query("SELECT id, venue_id, stall_slug, credit_price FROM venue_stalls ORDER BY id").all()).toEqual([
      { id: 8, venue_id: 2, stall_slug: "food", credit_price: null },
      { id: 14, venue_id: 2, stall_slug: "topup-stall", credit_price: null },
    ]);
    const tables = sqlite.query("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[];
    expect(tables.map(t => t.name)).not.toContain("events");
    expect(tables.map(t => t.name)).not.toContain("stall_payments");
    expect(sqlite.query("PRAGMA foreign_key_check").all()).toEqual([]);
  });
});
