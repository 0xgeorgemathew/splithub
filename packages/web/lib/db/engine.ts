/**
 * Compiles QueryPlans (lib/db/query.ts) into SQLite and runs them against D1.
 *
 * Resource embedding (`users!payer_wallet(name)`, `expense!inner(*)`, `stalls(*)`) is compiled into
 * correlated JSON subqueries, so filters on embedded columns, `!inner`, ordering and limits all stay
 * in one statement with PostgREST semantics.
 *
 * Pure module: works with any D1-compatible database (D1 in production, bun:sqlite in tests).
 */
import type { Filter, OrderBy, QueryPlan, QueryResult } from "./query";
import { AUTO_UPDATED_AT, ColumnType, DbError, TableSchema, getTable, schema } from "./schema";

export interface SqlStatement {
  bind(...values: unknown[]): SqlStatement;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

export interface SqlDatabase {
  prepare(query: string): SqlStatement;
  batch<T = Record<string, unknown>>(statements: SqlStatement[]): Promise<{ results: T[] }[]>;
}

export type ChangeEvent = {
  table: string;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown>;
  old: Record<string, unknown>;
  commit_timestamp: string;
};

export type EngineOutput = { result: QueryResult; changes: ChangeEvent[] };

const NOW_SQL = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";
const IDENT = /^[a-z_][a-z0-9_]*$/;

// ---------------------------------------------------------------------------
// Select-list parsing

type SelectField =
  | { kind: "star" }
  | { kind: "column"; name: string; alias: string }
  | { kind: "embed"; alias: string; name: string; hint?: string; inner: boolean; fields: SelectField[] };

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
  parts.push(current);
  return parts.map(part => part.replace(/\s+/g, " ").trim()).filter(Boolean);
}

export function parseSelect(columns: string): SelectField[] {
  const fields = splitTopLevel(columns || "*").map((item): SelectField => {
    if (item === "*") return { kind: "star" };

    const embed = item.match(
      /^(?:([a-z_][a-z0-9_]*)\s*:\s*)?([a-z_][a-z0-9_]*)((?:\s*![a-z_][a-z0-9_]*)*)\s*\(([\s\S]*)\)$/i,
    );
    if (embed) {
      const [, alias, name, hintPart, inner] = embed;
      const hints = hintPart
        .split("!")
        .map(hint => hint.trim())
        .filter(Boolean);
      const isInner = hints.includes("inner");
      const hint = hints.find(h => h !== "inner" && h !== "left");
      return { kind: "embed", alias: alias || name, name, hint, inner: isInner, fields: parseSelect(inner) };
    }

    const column = item.match(/^(?:([a-z_][a-z0-9_]*)\s*:\s*)?([a-z_][a-z0-9_]*)(?:::[a-z_]+)?$/i);
    if (column) {
      const [, alias, name] = column;
      return { kind: "column", name, alias: alias || name };
    }

    throw new DbError(`failed to parse select parameter (${item})`, "PGRST100");
  });
  return fields.length ? fields : [{ kind: "star" }];
}

// ---------------------------------------------------------------------------
// Relationships

type Relationship = {
  table: string;
  cardinality: "one" | "many";
  /** Column on the parent table */
  localColumn: string;
  /** Column on the embedded table */
  remoteColumn: string;
};

function resolveRelationship(parent: string, name: string, hint?: string): Relationship {
  const parentDef = getTable(parent);

  // `alias:fk_column(...)` embeds the table referenced by that column.
  const viaColumn = parentDef.foreignKeys.find(fk => fk.column === name);
  if (viaColumn && !schema[name]) {
    return {
      table: viaColumn.refTable,
      cardinality: "one",
      localColumn: viaColumn.column,
      remoteColumn: viaColumn.refColumn,
    };
  }

  const target = getTable(name);
  let candidates: (Relationship & { fkName: string; fkColumn: string })[] = [
    ...parentDef.foreignKeys
      .filter(fk => fk.refTable === name)
      .map(fk => ({
        table: name,
        cardinality: "one" as const,
        localColumn: fk.column,
        remoteColumn: fk.refColumn,
        fkName: fk.name,
        fkColumn: fk.column,
      })),
    ...target.foreignKeys
      .filter(fk => fk.refTable === parent)
      .map(fk => ({
        table: name,
        cardinality: "many" as const,
        localColumn: fk.refColumn,
        remoteColumn: fk.column,
        fkName: fk.name,
        fkColumn: fk.column,
      })),
  ];

  if (hint) {
    candidates = candidates.filter(candidate => candidate.fkName === hint || candidate.fkColumn === hint);
  }

  if (candidates.length === 0) {
    throw new DbError(
      `Could not find a relationship between '${parent}' and '${name}' in the schema cache`,
      "PGRST200",
    );
  }
  if (candidates.length > 1) {
    throw new DbError(
      `Could not embed because more than one relationship was found for '${parent}' and '${name}'`,
      "PGRST201",
      null,
      `Try changing '${name}' to one of: ${candidates.map(c => `${name}!${c.fkName}`).join(", ")}`,
    );
  }

  const [{ fkName: _fkName, fkColumn: _fkColumn, ...relationship }] = candidates;
  return relationship;
}

// ---------------------------------------------------------------------------
// Value conversion

export function toSqlValue(type: ColumnType | undefined, value: unknown): unknown {
  if (value === undefined || value === null) return null;
  switch (type) {
    case "boolean":
      return value === true || value === 1 || value === "true" ? 1 : 0;
    case "json":
      return JSON.stringify(value);
    case "timestamp": {
      if (value instanceof Date) return value.toISOString();
      if (typeof value === "string" || typeof value === "number") {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? value : date.toISOString();
      }
      return value;
    }
    case "integer":
    case "real":
      return typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value)) ? Number(value) : value;
    default:
      return typeof value === "object" ? JSON.stringify(value) : value;
  }
}

function fromSqlValue(type: ColumnType | undefined, value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (type === "boolean") return value === 1 || value === true || value === "1";
  if (type === "json" && typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

/** Converts a raw SQLite row (or a parsed json_object from an embed) into the shape supabase-js returned. */
function hydrate(table: string, fields: SelectField[], row: Record<string, unknown>, nested: boolean) {
  const def = getTable(table);
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.kind === "star") {
      for (const column of Object.keys(def.columns)) out[column] = fromSqlValue(def.columns[column], row[column]);
    } else if (field.kind === "column") {
      out[field.alias] = fromSqlValue(def.columns[field.name], row[field.alias]);
    } else {
      const relationship = resolveRelationship(table, field.name, field.hint);
      let value = row[field.alias];
      if (!nested && typeof value === "string") value = JSON.parse(value);
      if (relationship.cardinality === "many") {
        out[field.alias] = ((value as Record<string, unknown>[] | null) ?? []).map(child =>
          hydrate(relationship.table, field.fields, child, true),
        );
      } else {
        out[field.alias] = value
          ? hydrate(relationship.table, field.fields, value as Record<string, unknown>, true)
          : null;
      }
    }
  }
  return out;
}

export function hydrateRow(table: string, row: Record<string, unknown>) {
  return hydrate(table, [{ kind: "star" }], row, false);
}

// ---------------------------------------------------------------------------
// SQL compilation

const quote = (identifier: string) => {
  if (!IDENT.test(identifier)) throw new DbError(`invalid identifier "${identifier}"`, "42601");
  return `"${identifier}"`;
};

function assertColumn(def: TableSchema, table: string, column: string) {
  if (!(column in def.columns)) {
    throw new DbError(`column ${table}.${column} does not exist`, "42703");
  }
}

type CompileContext = { params: unknown[]; aliasCounter: number };

function nextAlias(ctx: CompileContext) {
  return `t${ctx.aliasCounter++}`;
}

function compileCondition(
  ctx: CompileContext,
  table: string,
  alias: string,
  filter: Extract<Filter, { kind: "op" }>,
  column: string,
): string {
  const def = getTable(table);
  assertColumn(def, table, column);
  const type = def.columns[column];
  const ref = `${alias}.${quote(column)}`;
  const bind = (value: unknown) => {
    ctx.params.push(toSqlValue(type, value));
    return "?";
  };

  let sql: string;
  switch (filter.op) {
    case "eq":
      sql = filter.value === null ? `${ref} IS NULL` : `${ref} = ${bind(filter.value)}`;
      break;
    case "neq":
      sql = filter.value === null ? `${ref} IS NOT NULL` : `${ref} != ${bind(filter.value)}`;
      break;
    case "gt":
      sql = `${ref} > ${bind(filter.value)}`;
      break;
    case "gte":
      sql = `${ref} >= ${bind(filter.value)}`;
      break;
    case "lt":
      sql = `${ref} < ${bind(filter.value)}`;
      break;
    case "lte":
      sql = `${ref} <= ${bind(filter.value)}`;
      break;
    case "like":
      // LIKE is case-insensitive in SQLite; GLOB gives Postgres LIKE's case-sensitive semantics.
      ctx.params.push(String(filter.value).replace(/%/g, "*").replace(/_/g, "?"));
      sql = `${ref} GLOB ?`;
      break;
    case "ilike":
      ctx.params.push(filter.value);
      sql = `${ref} LIKE ?`;
      break;
    case "is":
      sql = filter.value === null ? `${ref} IS NULL` : `${ref} = ${filter.value ? 1 : 0}`;
      break;
    case "in": {
      const values = Array.isArray(filter.value) ? filter.value : [filter.value];
      sql = values.length ? `${ref} IN (${values.map(bind).join(", ")})` : "0 = 1";
      break;
    }
    default:
      throw new DbError(`unsupported operator ${(filter as { op: string }).op}`, "PGRST100");
  }
  return filter.negate ? `NOT (${sql})` : sql;
}

type EmbedScope = {
  field: Extract<SelectField, { kind: "embed" }>;
  relationship: Relationship;
  filters: Filter[];
};

/** Splits filters into ones on this table and ones targeting embedded resources (`expense.status`). */
function partitionFilters(filters: Filter[], embeds: Map<string, EmbedScope>): Filter[] {
  const local: Filter[] = [];
  for (const filter of filters) {
    if (filter.kind === "op" && filter.column.includes(".")) {
      const [embedAlias, ...rest] = filter.column.split(".");
      const scope = embeds.get(embedAlias);
      if (!scope) {
        throw new DbError(`'${embedAlias}' is not an embedded resource in this request`, "PGRST108");
      }
      scope.filters.push({ ...filter, column: rest.join(".") });
    } else {
      local.push(filter);
    }
  }
  return local;
}

function compileFilters(ctx: CompileContext, table: string, alias: string, filters: Filter[]): string[] {
  return filters.map(filter => {
    if (filter.kind === "or") {
      const parts = filter.filters.map(inner => compileFilters(ctx, table, alias, [inner])[0]);
      return parts.length ? `(${parts.join(" OR ")})` : "0 = 1";
    }
    return compileCondition(ctx, table, alias, filter, filter.column);
  });
}

function collectEmbeds(table: string, fields: SelectField[]) {
  const embeds = new Map<string, EmbedScope>();
  for (const field of fields) {
    if (field.kind === "embed") {
      embeds.set(field.alias, { field, relationship: resolveRelationship(table, field.name, field.hint), filters: [] });
    }
  }
  return embeds;
}

/** json_object(...) expression describing one row of `table` for use inside an embed. */
function compileJsonObject(
  ctx: CompileContext,
  table: string,
  alias: string,
  fields: SelectField[],
  embeds: Map<string, EmbedScope>,
) {
  const def = getTable(table);
  const pairs: string[] = [];
  for (const field of fields) {
    if (field.kind === "star") {
      for (const [column, type] of Object.entries(def.columns)) {
        const ref = `${alias}.${quote(column)}`;
        pairs.push(`'${column}', ${type === "json" ? `json(${ref})` : ref}`);
      }
    } else if (field.kind === "column") {
      assertColumn(def, table, field.name);
      const ref = `${alias}.${quote(field.name)}`;
      pairs.push(`'${field.alias}', ${def.columns[field.name] === "json" ? `json(${ref})` : ref}`);
    } else {
      pairs.push(`'${field.alias}', json(${compileEmbedSubquery(ctx, alias, embeds.get(field.alias)!)})`);
    }
  }
  return `json_object(${pairs.join(", ")})`;
}

function compileEmbedSubquery(ctx: CompileContext, parentAlias: string, scope: EmbedScope): string {
  const { relationship, field } = scope;
  const alias = nextAlias(ctx);
  const childEmbeds = collectEmbeds(relationship.table, field.fields);
  const localFilters = partitionFilters(scope.filters, childEmbeds);
  const jsonObject = compileJsonObject(ctx, relationship.table, alias, field.fields, childEmbeds);
  const where = [
    `${alias}.${quote(relationship.remoteColumn)} = ${parentAlias}.${quote(relationship.localColumn)}`,
    ...compileFilters(ctx, relationship.table, alias, localFilters),
    ...compileInnerExists(ctx, alias, childEmbeds),
  ].join(" AND ");
  const from = `FROM ${quote(relationship.table)} ${alias} WHERE ${where}`;
  return relationship.cardinality === "many"
    ? `(SELECT json_group_array(${jsonObject}) ${from})`
    : `(SELECT ${jsonObject} ${from} LIMIT 1)`;
}

/** `!inner` embeds filter the parent rows: compile an EXISTS over the join plus the embed's filters. */
function compileInnerExists(ctx: CompileContext, parentAlias: string, embeds: Map<string, EmbedScope>) {
  const clauses: string[] = [];
  for (const scope of embeds.values()) {
    if (!scope.field.inner) continue;
    const alias = nextAlias(ctx);
    const childEmbeds = collectEmbeds(scope.relationship.table, scope.field.fields);
    const localFilters = partitionFilters(scope.filters, childEmbeds);
    const where = [
      `${alias}.${quote(scope.relationship.remoteColumn)} = ${parentAlias}.${quote(scope.relationship.localColumn)}`,
      ...compileFilters(ctx, scope.relationship.table, alias, localFilters),
      ...compileInnerExists(ctx, alias, childEmbeds),
    ].join(" AND ");
    clauses.push(`EXISTS (SELECT 1 FROM ${quote(scope.relationship.table)} ${alias} WHERE ${where})`);
  }
  return clauses;
}

function compileOrder(table: string, alias: string, order: OrderBy[]) {
  const def = getTable(table);
  return order.map(entry => {
    if (entry.column.includes(".")) {
      throw new DbError(`ordering by embedded column '${entry.column}' is not supported`, "PGRST100");
    }
    assertColumn(def, table, entry.column);
    return `${alias}.${quote(entry.column)} ${entry.ascending ? "ASC" : "DESC"} NULLS ${entry.nullsFirst ? "FIRST" : "LAST"}`;
  });
}

type CompiledSelect = {
  sql: string;
  params: unknown[];
  countSql: string;
  countParams: unknown[];
  fields: SelectField[];
};

export function compileSelect(
  plan: Pick<QueryPlan, "table" | "columns" | "filters" | "order" | "limit" | "offset">,
): CompiledSelect {
  const def = getTable(plan.table);
  const fields = parseSelect(plan.columns);
  const ctx: CompileContext = { params: [], aliasCounter: 1 };
  const alias = "t0";
  const embeds = collectEmbeds(plan.table, fields);
  const localFilters = partitionFilters(plan.filters, embeds);

  const projections: string[] = [];
  for (const field of fields) {
    if (field.kind === "star") {
      for (const column of Object.keys(def.columns)) projections.push(`${alias}.${quote(column)}`);
    } else if (field.kind === "column") {
      assertColumn(def, plan.table, field.name);
      projections.push(`${alias}.${quote(field.name)} AS ${quote(field.alias)}`);
    } else {
      projections.push(`${compileEmbedSubquery(ctx, alias, embeds.get(field.alias)!)} AS ${quote(field.alias)}`);
    }
  }

  const selectParamCount = ctx.params.length;
  const where = [...compileFilters(ctx, plan.table, alias, localFilters), ...compileInnerExists(ctx, alias, embeds)];
  const whereSql = where.length ? ` WHERE ${where.join(" AND ")}` : "";
  const whereParams = ctx.params.slice(selectParamCount);
  const order = compileOrder(plan.table, alias, plan.order);

  let sql = `SELECT ${projections.join(", ")} FROM ${quote(plan.table)} ${alias}${whereSql}`;
  if (order.length) sql += ` ORDER BY ${order.join(", ")}`;
  if (plan.limit !== undefined) sql += ` LIMIT ${Math.max(0, Math.floor(plan.limit))}`;
  if (plan.offset !== undefined)
    sql += `${plan.limit === undefined ? " LIMIT -1" : ""} OFFSET ${Math.max(0, Math.floor(plan.offset))}`;

  return {
    sql,
    params: ctx.params,
    countSql: `SELECT COUNT(*) AS count FROM ${quote(plan.table)} ${alias}${whereSql}`,
    countParams: whereParams,
    fields,
  };
}

function prepareWriteValues(table: string, values: Record<string, unknown>) {
  const def = getTable(table);
  const entries = Object.entries(values).filter(([, value]) => value !== undefined);
  for (const [column] of entries) {
    if (!(column in def.columns)) {
      throw new DbError(`Could not find the '${column}' column of '${table}' in the schema cache`, "PGRST204");
    }
  }
  return entries.map(([column, value]) => [column, toSqlValue(def.columns[column], value)] as const);
}

// ---------------------------------------------------------------------------
// Execution

function mapSqliteError(error: unknown): DbError {
  if (error instanceof DbError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const clean = message.replace(/^D1_ERROR:\s*/, "").replace(/:\s*SQLITE_[A-Z_]+$/, "");
  if (/UNIQUE constraint failed/i.test(message))
    return new DbError(`duplicate key value violates unique constraint (${clean})`, "23505", clean);
  if (/FOREIGN KEY constraint failed/i.test(message))
    return new DbError(`insert or update violates foreign key constraint (${clean})`, "23503", clean);
  if (/CHECK constraint failed/i.test(message))
    return new DbError(`new row violates check constraint (${clean})`, "23514", clean);
  if (/NOT NULL constraint failed/i.test(message))
    return new DbError(`null value violates not-null constraint (${clean})`, "23502", clean);
  return new DbError(clean, "XX000");
}

function errorResult(error: DbError, status = 400): EngineOutput {
  return { result: { data: null, error: error.toJSON(), count: null, status, statusText: "Error" }, changes: [] };
}

function applyCardinality(
  plan: QueryPlan,
  rows: Record<string, unknown>[],
  count: number | null,
  status: number,
): QueryResult {
  if (plan.cardinality) {
    if (rows.length === 1) return { data: rows[0], error: null, count, status, statusText: "OK" };
    if (rows.length === 0 && plan.cardinality === "maybeSingle")
      return { data: null, error: null, count, status, statusText: "OK" };
    return {
      data: null,
      error: {
        message: "JSON object requested, multiple (or no) rows returned",
        code: "PGRST116",
        details: `The result contains ${rows.length} rows`,
        hint: null,
      },
      count,
      status: 406,
      statusText: "Not Acceptable",
    };
  }
  return { data: plan.head ? null : rows, error: null, count, status, statusText: "OK" };
}

async function runSelect(
  db: SqlDatabase,
  plan: QueryPlan,
): Promise<{ rows: Record<string, unknown>[]; count: number | null }> {
  const compiled = compileSelect(plan);
  const statements = [db.prepare(compiled.sql).bind(...compiled.params)];
  if (plan.count) statements.push(db.prepare(compiled.countSql).bind(...compiled.countParams));
  const [rowsResult, countResult] = await db.batch(statements);
  const rows = (rowsResult.results as Record<string, unknown>[]).map(row =>
    hydrate(plan.table, compiled.fields, row, false),
  );
  const count = countResult ? Number((countResult.results[0] as { count: number }).count) : null;
  return { rows, count };
}

/** Re-reads mutated rows through the select compiler so `.select("*, embed(...)")` after a write works. */
async function selectReturning(db: SqlDatabase, plan: QueryPlan, rawRows: Record<string, unknown>[]) {
  const def = getTable(plan.table);
  const fields = parseSelect(plan.columns);
  const hasEmbeds = fields.some(field => field.kind === "embed");
  if (!hasEmbeds || plan.action === "delete") {
    return rawRows.map(row => hydrate(plan.table, fields, row, false));
  }
  const keys = rawRows.map(row => row[def.primaryKey]);
  if (!keys.length) return [];
  const { rows } = await runSelect(db, {
    ...plan,
    action: "select",
    filters: [{ kind: "op", column: def.primaryKey, op: "in", value: keys }],
    order: [],
    limit: undefined,
    offset: undefined,
    count: undefined,
    columns: `${plan.columns},__pk:${def.primaryKey}`,
  });
  const byKey = new Map(rows.map(row => [row.__pk, row]));
  return keys.map(key => {
    const row = { ...byKey.get(key) };
    delete row.__pk;
    return row;
  });
}

export async function executePlan(db: SqlDatabase, plan: QueryPlan): Promise<EngineOutput> {
  try {
    const def = getTable(plan.table);
    const table = quote(plan.table);
    const now = new Date().toISOString();

    if (plan.action === "select") {
      const { rows, count } = await runSelect(db, plan);
      return { result: applyCardinality(plan, rows, count, 200), changes: [] };
    }

    let statements: SqlStatement[] = [];
    let eventType: ChangeEvent["eventType"];

    if (plan.action === "insert" || plan.action === "upsert") {
      eventType = plan.action === "insert" ? "INSERT" : "UPDATE";
      const rows = Array.isArray(plan.values) ? plan.values : [plan.values ?? {}];
      const conflictColumns = (plan.onConflict || def.primaryKey).split(",").map(column => column.trim());
      for (const column of conflictColumns) assertColumn(def, plan.table, column);

      statements = rows.map(row => {
        const entries = prepareWriteValues(plan.table, row);
        const columns = entries.map(([column]) => quote(column));
        let sql = entries.length
          ? `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${entries.map(() => "?").join(", ")})`
          : `INSERT INTO ${table} DEFAULT VALUES`;

        if (plan.action === "upsert") {
          const updates = entries
            .filter(([column]) => !conflictColumns.includes(column))
            .map(([column]) => `${quote(column)} = excluded.${quote(column)}`);
          if (AUTO_UPDATED_AT.has(plan.table) && !entries.some(([column]) => column === "updated_at")) {
            updates.push(`"updated_at" = ${NOW_SQL}`);
          }
          sql +=
            plan.ignoreDuplicates || !updates.length
              ? ` ON CONFLICT (${conflictColumns.map(quote).join(", ")}) DO NOTHING`
              : ` ON CONFLICT (${conflictColumns.map(quote).join(", ")}) DO UPDATE SET ${updates.join(", ")}`;
        }
        return db.prepare(`${sql} RETURNING *`).bind(...entries.map(([, value]) => value));
      });
    } else if (plan.action === "update") {
      eventType = "UPDATE";
      const entries = prepareWriteValues(plan.table, plan.values as Record<string, unknown>);
      const sets = entries.map(([column]) => `${quote(column)} = ?`);
      if (AUTO_UPDATED_AT.has(plan.table) && !entries.some(([column]) => column === "updated_at")) {
        sets.push(`"updated_at" = ${NOW_SQL}`);
      }
      if (!sets.length) throw new DbError("update requires at least one column", "PGRST100");
      const ctx: CompileContext = { params: entries.map(([, value]) => value), aliasCounter: 1 };
      const where = compileFilters(ctx, plan.table, table, plan.filters);
      statements = [
        db
          .prepare(
            `UPDATE ${table} SET ${sets.join(", ")}${where.length ? ` WHERE ${where.join(" AND ")}` : ""} RETURNING *`,
          )
          .bind(...ctx.params),
      ];
    } else {
      eventType = "DELETE";
      const ctx: CompileContext = { params: [], aliasCounter: 1 };
      const where = compileFilters(ctx, plan.table, table, plan.filters);
      statements = [
        db
          .prepare(`DELETE FROM ${table}${where.length ? ` WHERE ${where.join(" AND ")}` : ""} RETURNING *`)
          .bind(...ctx.params),
      ];
    }

    const results = await db.batch(statements);
    const rawRows = results.flatMap(result => result.results as Record<string, unknown>[]);

    const changes: ChangeEvent[] = rawRows.map(row => {
      const record = hydrateRow(plan.table, row);
      const key = { [def.primaryKey]: record[def.primaryKey] };
      return {
        table: plan.table,
        eventType,
        new: eventType === "DELETE" ? {} : record,
        old: eventType === "DELETE" ? record : key,
        commit_timestamp: now,
      };
    });

    const status = plan.action === "insert" || plan.action === "upsert" ? 201 : plan.returning ? 200 : 204;
    if (!plan.returning) {
      return { result: { data: null, error: null, count: null, status, statusText: "OK" }, changes };
    }
    const rows = await selectReturning(db, plan, rawRows);
    return { result: applyCardinality(plan, rows, null, status), changes };
  } catch (error) {
    return errorResult(mapSqliteError(error));
  }
}
