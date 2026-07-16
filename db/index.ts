import { mkdirSync } from "node:fs";
import path from "node:path";
import { createClient, type Client, type InValue, type ResultSet } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

let client: Client | null = null;

function databaseConfig() {
  const remoteUrl = process.env.TURSO_DATABASE_URL?.trim();
  if (remoteUrl) {
    return { url: remoteUrl, authToken: process.env.TURSO_AUTH_TOKEN?.trim() };
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Turso is not configured. Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to the Vercel project.",
    );
  }

  const dataDirectory = path.join(process.cwd(), ".data");
  mkdirSync(dataDirectory, { recursive: true });
  return { url: `file:${path.join(dataDirectory, "elan.db")}` };
}

export function getClient() {
  client ??= createClient({ ...databaseConfig(), intMode: "number" });
  return client;
}

export function getDb() {
  return drizzle(getClient(), { schema });
}

function normalizeValue(value: unknown): InValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "bigint" ||
    typeof value === "boolean" ||
    value instanceof Uint8Array
  ) {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function resultRows<T>(result: ResultSet): T[] {
  return result.rows.map((row) =>
    Object.fromEntries(result.columns.map((column, index) => [column, row[index]])) as T,
  );
}

export class SqlStatement {
  constructor(
    readonly sql: string,
    readonly args: InValue[] = [],
  ) {}

  bind(...args: unknown[]) {
    return new SqlStatement(this.sql, args.map(normalizeValue));
  }

  toLibSqlStatement() {
    return { sql: this.sql, args: this.args };
  }

  async all<T>() {
    const result = await getClient().execute(this.toLibSqlStatement());
    return { results: resultRows<T>(result) };
  }

  async first<T>() {
    const result = await getClient().execute(this.toLibSqlStatement());
    return resultRows<T>(result)[0] ?? null;
  }

  async run() {
    const result = await getClient().execute(this.toLibSqlStatement());
    return {
      success: true,
      meta: { changes: result.rowsAffected, lastRowId: result.lastInsertRowid ?? null },
    };
  }
}

/** A small D1-compatible surface used by the existing SQL-heavy seed routes. */
export const sqlite = {
  prepare(sql: string) {
    return new SqlStatement(sql);
  },
  async batch(statements: SqlStatement[]) {
    if (!statements.length) return [];
    return getClient().batch(
      statements.map((statement) => statement.toLibSqlStatement()),
      "write",
    );
  },
};
