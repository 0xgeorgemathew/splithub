/**
 * Isomorphic, supabase-js compatible query builder.
 *
 * The builder only records a serializable QueryPlan. Awaiting it hands the plan to an executor:
 * on the server that is D1 (lib/db/server.ts), in the browser it is POST /api/db.
 * Only the subset of the PostgREST API that SplitHub uses is supported.
 */

export type FilterOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike" | "is" | "in";

export type Filter =
  | { kind: "op"; column: string; op: FilterOp; value: unknown; negate?: boolean }
  | { kind: "or"; filters: Filter[] };

export type OrderBy = { column: string; ascending: boolean; nullsFirst: boolean };

export type QueryAction = "select" | "insert" | "update" | "upsert" | "delete";

export type QueryPlan = {
  table: string;
  action: QueryAction;
  /** Column list for selects, or for the RETURNING projection of mutations when `returning` is set. */
  columns: string;
  returning: boolean;
  values?: Record<string, unknown> | Record<string, unknown>[];
  onConflict?: string;
  ignoreDuplicates?: boolean;
  filters: Filter[];
  order: OrderBy[];
  limit?: number;
  offset?: number;
  cardinality?: "single" | "maybeSingle";
  count?: "exact";
  head?: boolean;
};

export type DbErrorShape = { message: string; code: string; details: string | null; hint: string | null };

/** Same shape as supabase-js PostgrestSingleResponse: callers narrow `data` by checking `error`. */
export type QueryResult<T = any> =
  | { data: T; error: null; count: number | null; status: number; statusText: string }
  | { data: null; error: DbErrorShape; count: number | null; status: number; statusText: string };

export type QueryExecutor = (plan: QueryPlan) => Promise<QueryResult>;

/** `Row` is the row type, `T` the resolved `data` type (rows by default, one row after `.single()`). */
export class QueryBuilder<Row = any, T = Row[]> implements PromiseLike<QueryResult<T>> {
  private plan: QueryPlan;

  constructor(
    table: string,
    private readonly execute: QueryExecutor,
  ) {
    this.plan = { table, action: "select", columns: "*", returning: false, filters: [], order: [] };
  }

  select(columns = "*", options?: { count?: "exact"; head?: boolean }) {
    if (this.plan.action === "select") {
      this.plan.columns = columns;
    } else {
      this.plan.returning = true;
      this.plan.columns = columns;
    }
    if (options?.count) this.plan.count = options.count;
    if (options?.head) this.plan.head = true;
    return this;
  }

  insert(values: Record<string, unknown> | Record<string, unknown>[]) {
    this.plan.action = "insert";
    this.plan.values = values;
    return this;
  }

  upsert(
    values: Record<string, unknown> | Record<string, unknown>[],
    options?: { onConflict?: string; ignoreDuplicates?: boolean },
  ) {
    this.plan.action = "upsert";
    this.plan.values = values;
    this.plan.onConflict = options?.onConflict;
    this.plan.ignoreDuplicates = options?.ignoreDuplicates;
    return this;
  }

  update(values: Record<string, unknown>) {
    this.plan.action = "update";
    this.plan.values = values;
    return this;
  }

  delete() {
    this.plan.action = "delete";
    return this;
  }

  private addFilter(column: string, op: FilterOp, value: unknown, negate = false) {
    this.plan.filters.push({ kind: "op", column, op, value, negate });
    return this;
  }

  eq(column: string, value: unknown) {
    return this.addFilter(column, "eq", value);
  }
  neq(column: string, value: unknown) {
    return this.addFilter(column, "neq", value);
  }
  gt(column: string, value: unknown) {
    return this.addFilter(column, "gt", value);
  }
  gte(column: string, value: unknown) {
    return this.addFilter(column, "gte", value);
  }
  lt(column: string, value: unknown) {
    return this.addFilter(column, "lt", value);
  }
  lte(column: string, value: unknown) {
    return this.addFilter(column, "lte", value);
  }
  like(column: string, pattern: string) {
    return this.addFilter(column, "like", pattern);
  }
  ilike(column: string, pattern: string) {
    return this.addFilter(column, "ilike", pattern);
  }
  is(column: string, value: null | boolean) {
    return this.addFilter(column, "is", value);
  }
  in(column: string, values: readonly unknown[]) {
    return this.addFilter(column, "in", [...values]);
  }
  not(column: string, op: FilterOp, value: unknown) {
    return this.addFilter(column, op, value, true);
  }
  filter(column: string, op: FilterOp, value: unknown) {
    return this.addFilter(column, op, value);
  }
  match(query: Record<string, unknown>) {
    for (const [column, value] of Object.entries(query)) this.addFilter(column, "eq", value);
    return this;
  }

  /** PostgREST logic-tree syntax, e.g. `payer.eq.0xabc,recipient.eq.0xabc`. */
  or(expression: string) {
    this.plan.filters.push({ kind: "or", filters: parseOrExpression(expression) });
    return this;
  }

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
    const ascending = options?.ascending ?? true;
    this.plan.order.push({ column, ascending, nullsFirst: options?.nullsFirst ?? !ascending });
    return this;
  }

  limit(count: number) {
    this.plan.limit = count;
    return this;
  }

  range(from: number, to: number) {
    this.plan.offset = from;
    this.plan.limit = to - from + 1;
    return this;
  }

  single() {
    this.plan.cardinality = "single";
    return this as unknown as QueryBuilder<Row, Row>;
  }

  maybeSingle() {
    this.plan.cardinality = "maybeSingle";
    return this as unknown as QueryBuilder<Row, Row | null>;
  }

  returns<R>() {
    return this as unknown as QueryBuilder<R extends (infer E)[] ? E : R, R>;
  }

  toPlan(): QueryPlan {
    return structuredClone(this.plan);
  }

  then<R1 = QueryResult<T>, R2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): Promise<R1 | R2> {
    return this.execute(this.toPlan()).then(onfulfilled as (value: QueryResult) => R1 | PromiseLike<R1>, onrejected);
  }
}

const FILTER_OPS = new Set<FilterOp>(["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is", "in"]);

function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of input) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current);
  return parts.map(part => part.trim()).filter(Boolean);
}

function parseFilterValue(op: FilterOp, raw: string): unknown {
  if (op === "is") {
    if (raw === "null") return null;
    if (raw === "true") return true;
    if (raw === "false") return false;
  }
  if (op === "in") {
    return splitTopLevel(raw.replace(/^\(/, "").replace(/\)$/, "")).map(value => value.replace(/^"|"$/g, ""));
  }
  return raw.replace(/^"|"$/g, "");
}

export function parseOrExpression(expression: string): Filter[] {
  return splitTopLevel(expression).map(part => {
    const nested = part.match(/^(and|or)\((.*)\)$/);
    if (nested) {
      if (nested[1] === "or") return { kind: "or", filters: parseOrExpression(nested[2]) } as Filter;
      throw new Error(`Unsupported nested 'and' in or() filter: ${part}`);
    }
    const segments = part.split(".");
    const column = segments.shift()!;
    let negate = false;
    let op = segments.shift() as FilterOp | "not";
    if (op === "not") {
      negate = true;
      op = segments.shift() as FilterOp;
    }
    if (!FILTER_OPS.has(op as FilterOp)) {
      throw new Error(`Unsupported operator in or() filter: ${part}`);
    }
    return {
      kind: "op",
      column,
      op: op as FilterOp,
      value: parseFilterValue(op as FilterOp, segments.join(".")),
      negate,
    };
  });
}
