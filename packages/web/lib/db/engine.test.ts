import { SqlDatabase, SqlStatement, executePlan } from "./engine";
import { QueryBuilder, QueryPlan } from "./query";
import { schema } from "./schema";
import { Database } from "bun:sqlite";
import { beforeEach, describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

class BunStatement implements SqlStatement {
  constructor(
    private db: Database,
    readonly sql: string,
    readonly params: unknown[] = [],
  ) {}
  bind(...values: unknown[]) {
    return new BunStatement(this.db, this.sql, values);
  }
  async all<T>() {
    return { results: this.db.query(this.sql).all(...(this.params as any[])) as T[] };
  }
}

function createDb() {
  const sqlite = new Database(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  const dir = join(import.meta.dir, "../../migrations");
  for (const file of readdirSync(dir).sort()) sqlite.exec(readFileSync(join(dir, file), "utf8"));

  const db: SqlDatabase = {
    prepare: sql => new BunStatement(sqlite, sql),
    async batch(statements) {
      return sqlite.transaction(() =>
        statements.map(statement => {
          const s = statement as BunStatement;
          return { results: sqlite.query(s.sql).all(...(s.params as any[])) as any[] };
        }),
      )();
    },
  };
  return { sqlite, db };
}

let db: SqlDatabase;
let sqlite: Database;
let changes: unknown[];

const from = (table: string) =>
  new QueryBuilder(table, async (plan: QueryPlan) => {
    const output = await executePlan(db, plan);
    changes.push(...output.changes);
    return output.result;
  });

const alice = "0xaaa";
const bob = "0xbbb";

beforeEach(async () => {
  ({ db, sqlite } = createDb());
  changes = [];
  await from("users").insert([
    { wallet_address: alice, name: "Alice", privy_user_id: "did:a", twitter_handle: "AliceX", chip_address: "0xchip" },
    { wallet_address: bob, name: "Bob", privy_user_id: "did:b", twitter_handle: "bobby" },
  ]);
});

describe("schema metadata", () => {
  test("matches the SQL migrations", () => {
    for (const [table, def] of Object.entries(schema)) {
      const columns = (sqlite.query(`PRAGMA table_info(${table})`).all() as { name: string; pk: number }[]).map(
        c => c.name,
      );
      expect(columns.sort()).toEqual(Object.keys(def.columns).sort());
      const pk = (sqlite.query(`PRAGMA table_info(${table})`).all() as { name: string; pk: number }[]).find(c => c.pk);
      expect(pk?.name).toBe(def.primaryKey);
      const fks = (
        sqlite.query(`PRAGMA foreign_key_list(${table})`).all() as { from: string; table: string; to: string }[]
      )
        .map(fk => `${fk.from}->${fk.table}.${fk.to}`)
        .sort();
      expect(fks).toEqual(def.foreignKeys.map(fk => `${fk.column}->${fk.refTable}.${fk.refColumn}`).sort());
    }
    const sqlTables = (
      sqlite.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as {
        name: string;
      }[]
    )
      .map(t => t.name)
      .sort();
    expect(sqlTables).toEqual(Object.keys(schema).sort());
  });
});

describe("select", () => {
  test("filters, not-null, ilike, order and limit", async () => {
    const { data, error } = await from("users")
      .select("wallet_address, name")
      .not("chip_address", "is", null)
      .ilike("twitter_handle", "%alice%")
      .order("created_at", { ascending: false })
      .limit(5);
    expect(error).toBeNull();
    expect(data).toEqual([{ wallet_address: alice, name: "Alice" }]);
  });

  test("single returns PGRST116 when no rows match; maybeSingle returns null", async () => {
    const single = await from("users").select("*").eq("wallet_address", "0xnope").single();
    expect(single.data).toBeNull();
    expect(single.error?.code).toBe("PGRST116");

    const maybe = await from("users").select("*").eq("wallet_address", "0xnope").maybeSingle();
    expect(maybe).toMatchObject({ data: null, error: null });
  });

  test("or() logic tree", async () => {
    await from("settlements").insert([
      { payer_wallet: alice, payee_wallet: bob, amount: 5, token_address: "0xusdc", status: "completed" },
      { payer_wallet: bob, payee_wallet: alice, amount: 2, token_address: "0xusdc", status: "completed" },
    ]);
    const { data } = await from("settlements")
      .select("*")
      .eq("status", "completed")
      .or(`payer_wallet.eq.${alice},payee_wallet.eq.${alice}`);
    expect(data).toHaveLength(2);
    const { data: none } = await from("settlements").select("*").or("payer_wallet.eq.0xzzz,payee_wallet.eq.0xzzz");
    expect(none).toHaveLength(0);
  });

  test("count exact", async () => {
    const { count, data } = await from("users").select("*", { count: "exact" }).limit(1);
    expect(count).toBe(2);
    expect(data).toHaveLength(1);
  });
});

describe("embeds", () => {
  beforeEach(async () => {
    await from("payment_requests").insert({
      payer: bob,
      recipient: alice,
      token: "0xusdc",
      amount: "25.00",
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    });
  });

  test("many-to-one with FK constraint-name hints", async () => {
    const { data, error } = await from("payment_requests")
      .select(
        `
        *,
        payer_user:users!payment_requests_payer_fkey(
          name,
          twitter_handle,
          twitter_profile_url
        ),
        recipient_user:users!payment_requests_recipient_fkey(name, twitter_handle, twitter_profile_url)
      `,
      )
      .eq("recipient", alice)
      .order("created_at", { ascending: false });
    expect(error).toBeNull();
    expect(data[0].payer_user).toEqual({ name: "Bob", twitter_handle: "bobby", twitter_profile_url: null });
    expect(data[0].recipient_user.name).toBe("Alice");
    expect(data[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  test("ambiguous embed without hint errors like PostgREST", async () => {
    const { error } = await from("payment_requests").select("*, users(name)");
    expect(error?.code).toBe("PGRST201");
  });

  test("!inner with filters on embedded columns filters parent rows before limit", async () => {
    const { data: e1 } = await from("expense")
      .insert({ creator_wallet: bob, description: "Lunch", total_amount: 10, token_address: "0xbob-token" })
      .select()
      .single();
    const { data: e2 } = await from("expense")
      .insert({ creator_wallet: alice, description: "Dinner", total_amount: 20, token_address: "0xalice-token" })
      .select()
      .single();
    await from("expense_participants").insert([
      { expense_id: e1.id, wallet_address: alice, share_amount: 5, is_creator: false },
      { expense_id: e2.id, wallet_address: alice, share_amount: 10, is_creator: true },
    ]);

    const { data, error } = await from("expense_participants")
      .select(
        `
        expense!inner (
          token_address,
          creator_wallet
        )
      `,
      )
      .eq("wallet_address", alice)
      .eq("expense.creator_wallet", alice)
      .limit(1);
    expect(error).toBeNull();
    expect(data).toEqual([{ expense: { token_address: "0xalice-token", creator_wallet: alice } }]);

    const { data: joined } = await from("expense_participants")
      .select("expense_id, is_creator, expense (*)")
      .eq("wallet_address", alice);
    expect(joined.map((row: any) => row.is_creator).sort()).toEqual([false, true]);
    expect(joined[0].expense.description).toBeDefined();
  });

  test("alias:fk_column embed and one-to-many nested embeds", async () => {
    const { data: venue } = await from("venues")
      .insert({ venue_name: "Arcade", venue_slug: "arcade", owner_wallet: alice, chain_venue_id: 1 })
      .select()
      .single();
    const { data: stalls } = await from("venue_stalls")
      .insert([
        { venue_id: venue.id, stall_name: "Laser Tag", stall_slug: "laser-tag", credit_price: 50 },
        { venue_id: venue.id, stall_name: "Snacks", stall_slug: "snacks" },
      ])
      .select();
    const laserTag = stalls.find((s: any) => s.stall_slug === "laser-tag");
    await from("venue_credit_activity").insert([
      { venue_id: venue.id, guest_wallet: bob, kind: "topup", credits: 100, usdc_amount: 10, tx_hash: "0x1" },
      { venue_id: venue.id, stall_id: laserTag.id, guest_wallet: bob, kind: "spend", credits: 50, tx_hash: "0x2" },
    ]);

    const { data } = await from("venues")
      .select(
        `
          *,
          owner_user:users!owner_wallet(name, twitter_handle, twitter_profile_url),
          venue_stalls(*)
        `,
      )
      .eq("owner_wallet", alice);
    expect(data[0].owner_user.name).toBe("Alice");
    expect(data[0].venue_stalls).toHaveLength(2);
    expect(data[0].venue_stalls.find((s: any) => s.stall_slug === "snacks").credit_price).toBeNull();

    const { data: activity } = await from("venue_credit_activity")
      .select("kind, credits, guest_user:users!guest_wallet(name), stall:venue_stalls!stall_id(stall_name)")
      .eq("venue_id", venue.id)
      .order("id", { ascending: true });
    expect(activity).toEqual([
      { kind: "topup", credits: 100, guest_user: { name: "Bob" }, stall: null },
      { kind: "spend", credits: 50, guest_user: { name: "Bob" }, stall: { stall_name: "Laser Tag" } },
    ]);

    const { data: withVenue } = await from("venue_stalls")
      .select("*, venue:venues!venue_id!inner(*)")
      .eq("venue.venue_slug", "arcade")
      .eq("stall_slug", "laser-tag");
    expect(withVenue[0].venue.venue_slug).toBe("arcade");

    const { data: circle } = await from("circles").insert({ name: "Crew", creator_wallet: alice }).select().single();
    expect(circle.is_active).toBe(true);
    await from("circle_members").insert({ circle_id: circle.id, member_wallet: bob });
    const { data: members } = await from("circle_members")
      .select(`member_wallet, users:member_wallet ( wallet_address, name )`)
      .eq("circle_id", circle.id);
    expect(members).toEqual([{ member_wallet: bob, users: { wallet_address: bob, name: "Bob" } }]);
  });
});

describe("mutations", () => {
  test("update returns rows, bumps updated_at, emits changes", async () => {
    const { data: venue } = await from("venues")
      .insert({ venue_name: "Fest", venue_slug: "fest", owner_wallet: alice })
      .select("*")
      .single();
    changes = [];
    await new Promise(resolve => setTimeout(resolve, 5));
    const { data, error } = await from("venues").update({ status: "paused" }).eq("id", venue.id).select("*").single();
    expect(error).toBeNull();
    expect(data.status).toBe("paused");
    expect(data.updated_at > venue.updated_at).toBe(true);
    expect(changes).toMatchObject([
      { table: "venues", eventType: "UPDATE", new: { status: "paused" }, old: { id: venue.id } },
    ]);
  });

  test("upsert onConflict", async () => {
    const upsert = (store_name: string) =>
      from("stores")
        .upsert({ owner_wallet: alice, store_name, store_slug: "corner" }, { onConflict: "store_slug" })
        .select()
        .single();
    const first = (await upsert("Corner")).data;
    const second = (await upsert("Corner Shop")).data;
    expect(second.id).toBe(first.id);
    expect(second.store_name).toBe("Corner Shop");
    await from("store_items").insert({ store_id: first.id, name: "A", price: 1.5, stock: 3 });
    const { data: store } = await from("stores").select("*, store_items(*)").eq("id", first.id).single();
    expect(store.store_items).toHaveLength(1);
    expect(store.store_items[0].stock).toBe(3);
  });

  test("constraint errors map to Postgres codes", async () => {
    const dup = await from("users").insert({ wallet_address: alice, name: "Again", privy_user_id: "did:z" });
    expect(dup.error?.code).toBe("23505");
    const fk = await from("expense").insert({ creator_wallet: "0xghost", total_amount: 1, token_address: "0x" });
    expect(fk.error?.code).toBe("23503");
    const unknownColumn = await from("users").update({ nope: 1 }).eq("wallet_address", alice);
    expect(unknownColumn.error?.code).toBe("PGRST204");
  });

  test("delete returns rows and cascades", async () => {
    const { data: circle } = await from("circles").insert({ name: "Crew", creator_wallet: alice }).select().single();
    await from("circle_members").insert({ circle_id: circle.id, member_wallet: bob });
    const { error } = await from("circles").delete().eq("id", circle.id);
    expect(error).toBeNull();
    const { data } = await from("circle_members").select("*");
    expect(data).toEqual([]);
  });

  test("timestamps are normalized to ISO UTC", async () => {
    const { data } = await from("payment_requests")
      .insert({ payer: alice, recipient: bob, token: "0x", amount: "1", expires_at: "2099-01-01T00:00:00+00:00" })
      .select()
      .single();
    expect(data.expires_at).toBe("2099-01-01T00:00:00.000Z");
    const { data: found } = await from("payment_requests").select("id").gte("expires_at", "2098-12-31");
    expect(found).toHaveLength(1);
  });
});
