/**
 * Table metadata for the D1 database. Mirrors migrations/*.sql and drives:
 * - value conversion (SQLite stores booleans as 0/1 and JSON/arrays as TEXT)
 * - timestamp normalization (all timestamps are ISO-8601 UTC strings so they sort and compare lexically)
 * - PostgREST-style resource embedding through foreign keys
 *
 * lib/db/schema.test.ts checks this file against the SQL migrations.
 */

export type ColumnType = "text" | "integer" | "real" | "boolean" | "json" | "timestamp";

export type ForeignKey = {
  /** Postgres-style constraint name (`<table>_<column>_fkey`); usable as an embed hint. */
  name: string;
  column: string;
  refTable: string;
  refColumn: string;
};

export type TableSchema = {
  primaryKey: string;
  columns: Record<string, ColumnType>;
  foreignKeys: ForeignKey[];
};

type TableDef = {
  primaryKey: string;
  columns: Record<string, ColumnType>;
  references?: Record<string, `${string}.${string}`>;
};

const T = "timestamp" as const;

const defs: Record<string, TableDef> = {
  users: {
    primaryKey: "wallet_address",
    columns: {
      wallet_address: "text",
      chip_address: "text",
      name: "text",
      email: "text",
      privy_user_id: "text",
      twitter_handle: "text",
      twitter_profile_url: "text",
      twitter_user_id: "text",
      chip_registration_status: "text",
      approval_status: "text",
      created_at: T,
    },
  },
  expense: {
    primaryKey: "id",
    columns: {
      id: "integer",
      created_at: T,
      creator_wallet: "text",
      description: "text",
      total_amount: "real",
      status: "text",
      token_address: "text",
    },
    references: { creator_wallet: "users.wallet_address" },
  },
  expense_participants: {
    primaryKey: "id",
    columns: {
      id: "integer",
      created_at: T,
      expense_id: "integer",
      wallet_address: "text",
      share_amount: "real",
      is_creator: "boolean",
    },
    references: { expense_id: "expense.id", wallet_address: "users.wallet_address" },
  },
  settlements: {
    primaryKey: "id",
    columns: {
      id: "integer",
      created_at: T,
      payer_wallet: "text",
      payee_wallet: "text",
      amount: "real",
      token_address: "text",
      tx_hash: "text",
      status: "text",
      completed_at: T,
    },
    references: { payer_wallet: "users.wallet_address", payee_wallet: "users.wallet_address" },
  },
  payment_requests: {
    primaryKey: "id",
    columns: {
      id: "text",
      payer: "text",
      recipient: "text",
      token: "text",
      amount: "text",
      memo: "text",
      status: "text",
      tx_hash: "text",
      expires_at: T,
      created_at: T,
      completed_at: T,
      requester_twitter: "text",
      payer_twitter: "text",
    },
    references: { payer: "users.wallet_address", recipient: "users.wallet_address" },
  },
  circles: {
    primaryKey: "id",
    columns: { id: "text", name: "text", creator_wallet: "text", is_active: "boolean", created_at: T },
    references: { creator_wallet: "users.wallet_address" },
  },
  circle_members: {
    primaryKey: "id",
    columns: { id: "text", circle_id: "text", member_wallet: "text", added_at: T },
    references: { circle_id: "circles.id", member_wallet: "users.wallet_address" },
  },
  events: {
    primaryKey: "id",
    columns: {
      id: "integer",
      created_at: T,
      updated_at: T,
      event_name: "text",
      event_slug: "text",
      event_description: "text",
      owner_wallet: "text",
      status: "text",
      start_date: T,
      end_date: T,
    },
    references: { owner_wallet: "users.wallet_address" },
  },
  stalls: {
    primaryKey: "id",
    columns: {
      id: "integer",
      created_at: T,
      updated_at: T,
      event_id: "integer",
      stall_name: "text",
      stall_slug: "text",
      stall_description: "text",
      operator_twitter_handle: "text",
      operator_wallet: "text",
      split_percentage: "real",
      status: "text",
      token_address: "text",
    },
    references: { event_id: "events.id", operator_wallet: "users.wallet_address" },
  },
  stall_payments: {
    primaryKey: "id",
    columns: {
      id: "integer",
      created_at: T,
      stall_id: "integer",
      event_id: "integer",
      payer_wallet: "text",
      amount: "real",
      token_address: "text",
      operator_amount: "real",
      owner_amount: "real",
      tx_hash: "text",
      status: "text",
      completed_at: T,
      memo: "text",
    },
    references: { stall_id: "stalls.id", event_id: "events.id", payer_wallet: "users.wallet_address" },
  },
  store_items: {
    primaryKey: "id",
    columns: {
      id: "integer",
      stall_id: "integer",
      sku: "text",
      name: "text",
      description: "text",
      price: "real",
      token_address: "text",
      status: "text",
      image_url: "text",
      created_at: T,
      updated_at: T,
    },
    references: { stall_id: "stalls.id" },
  },
  store_inventory: {
    primaryKey: "item_id",
    columns: {
      item_id: "integer",
      current_stock: "integer",
      reorder_threshold: "integer",
      target_stock: "integer",
      last_restocked_at: T,
      updated_at: T,
    },
    references: { item_id: "store_items.id" },
  },
  store_orders: {
    primaryKey: "id",
    columns: {
      id: "integer",
      stall_id: "integer",
      buyer_wallet: "text",
      subtotal: "real",
      manager_amount: "real",
      admin_amount: "real",
      token_address: "text",
      tx_hash: "text",
      status: "text",
      created_at: T,
      completed_at: T,
    },
    references: { stall_id: "stalls.id", buyer_wallet: "users.wallet_address" },
  },
  store_order_items: {
    primaryKey: "id",
    columns: {
      id: "integer",
      order_id: "integer",
      item_id: "integer",
      quantity: "integer",
      unit_price: "real",
      created_at: T,
    },
    references: { order_id: "store_orders.id", item_id: "store_items.id" },
  },
};

export const schema: Record<string, TableSchema> = Object.fromEntries(
  Object.entries(defs).map(([table, def]) => [
    table,
    {
      primaryKey: def.primaryKey,
      columns: def.columns,
      foreignKeys: Object.entries(def.references ?? {}).map(([column, target]) => {
        const [refTable, refColumn] = target.split(".");
        return { name: `${table}_${column}_fkey`, column, refTable, refColumn };
      }),
    },
  ]),
);

/** Tables whose `updated_at` column is maintained automatically on update (Postgres triggers in the old schema). */
export const AUTO_UPDATED_AT = new Set(Object.keys(schema).filter(table => "updated_at" in schema[table].columns));

export function getTable(table: string): TableSchema {
  const def = schema[table];
  if (!def) {
    throw new DbError(`relation "public.${table}" does not exist`, "42P01");
  }
  return def;
}

export class DbError extends Error {
  code: string;
  details: string | null;
  hint: string | null;

  constructor(message: string, code = "PGRST000", details: string | null = null, hint: string | null = null) {
    super(message);
    this.name = "DbError";
    this.code = code;
    this.details = details;
    this.hint = hint;
  }

  toJSON() {
    return { message: this.message, code: this.code, details: this.details, hint: this.hint };
  }
}
