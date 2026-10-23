import { type RowLoader, assertBrowserPlanAllowed, assertBrowserWriteOwned } from "./policy";
import type { QueryPlan } from "./query";
import { describe, expect, test } from "bun:test";

const me = "0xme";
const other = "0xother";

const plan = (table: string, action: QueryPlan["action"], values?: QueryPlan["values"]): QueryPlan => ({
  table,
  action,
  columns: "*",
  returning: false,
  values,
  filters: [{ kind: "op", column: "id", op: "gte", value: 0 }],
  order: [],
});

const db: Record<string, Record<string, unknown>[]> = {
  circles: [
    { id: "c-mine", creator_wallet: me },
    { id: "c-other", creator_wallet: other },
  ],
  expense: [
    { id: 1, creator_wallet: me },
    { id: 2, creator_wallet: other },
  ],
};
const load: RowLoader = async (table, column, values) => (db[table] ?? []).filter(row => values.includes(row[column]));

describe("browser write policy", () => {
  test("blocks tables browsers may not write", () => {
    expect(() => assertBrowserPlanAllowed(plan("users", "update", { name: "x" }))).toThrow("permission denied");
    expect(() => assertBrowserPlanAllowed(plan("events", "delete"))).toThrow("permission denied");
    expect(() => assertBrowserPlanAllowed(plan("stall_payments", "insert", {}))).toThrow("permission denied");
  });

  test("a broad delete fails if any matched row belongs to someone else", async () => {
    await expect(assertBrowserWriteOwned(plan("expense", "delete"), me, db.expense, load)).rejects.toThrow();
    await expect(
      assertBrowserWriteOwned(plan("expense", "delete"), me, [db.expense[0]], load),
    ).resolves.toBeUndefined();
  });

  test("inserts must be owned by the caller", async () => {
    await expect(
      assertBrowserWriteOwned(plan("expense", "insert", { creator_wallet: other }), me, [], load),
    ).rejects.toThrow();
    await expect(
      assertBrowserWriteOwned(plan("circles", "insert", { creator_wallet: me.toUpperCase() }), me, [], load),
    ).resolves.toBeUndefined();
  });

  test("circle members: only the creator adds; members may remove themselves", async () => {
    await expect(
      assertBrowserWriteOwned(
        plan("circle_members", "insert", [{ circle_id: "c-other", member_wallet: me }]),
        me,
        [],
        load,
      ),
    ).rejects.toThrow();
    await expect(
      assertBrowserWriteOwned(
        plan("circle_members", "delete"),
        me,
        [{ circle_id: "c-other", member_wallet: me }],
        load,
      ),
    ).resolves.toBeUndefined();
    await expect(
      assertBrowserWriteOwned(
        plan("circle_members", "delete"),
        me,
        [{ circle_id: "c-other", member_wallet: other }],
        load,
      ),
    ).rejects.toThrow();
  });

  test("expense participants follow the expense creator; circle owner cannot be reassigned", async () => {
    await expect(
      assertBrowserWriteOwned(plan("expense_participants", "insert", [{ expense_id: 2 }]), me, [], load),
    ).rejects.toThrow();
    await expect(
      assertBrowserWriteOwned(plan("circles", "update", { creator_wallet: other }), me, [db.circles[0]], load),
    ).rejects.toThrow();
  });
});
