import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";

const root = process.cwd();
const remoteUrl = process.env.TURSO_DATABASE_URL?.trim();

if (!remoteUrl && process.env.VERCEL) {
  throw new Error(
    "Turso is not configured. Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to the Vercel project.",
  );
}

const localDirectory = path.join(root, ".data");
if (!remoteUrl) mkdirSync(localDirectory, { recursive: true });

const client = createClient({
  url: remoteUrl || `file:${path.join(localDirectory, "elan.db")}`,
  authToken: remoteUrl ? process.env.TURSO_AUTH_TOKEN?.trim() : undefined,
});

await client.execute(`
  CREATE TABLE IF NOT EXISTS __elan_migrations (
    name TEXT PRIMARY KEY NOT NULL,
    applied_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
  )
`);

const migrationDirectory = path.join(root, "drizzle");
const migrationFiles = readdirSync(migrationDirectory)
  .filter((file) => file.endsWith(".sql"))
  .sort();

for (const name of migrationFiles) {
  const applied = await client.execute({
    sql: "SELECT name FROM __elan_migrations WHERE name = ? LIMIT 1",
    args: [name],
  });
  if (applied.rows.length) continue;

  const statements = readFileSync(path.join(migrationDirectory, name), "utf8")
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean)
    .map((sql) => ({ sql, args: [] }));

  await client.batch(
    [
      ...statements,
      {
        sql: "INSERT INTO __elan_migrations (name) VALUES (?)",
        args: [name],
      },
    ],
    "write",
  );
  process.stdout.write(`Applied ${name}\n`);
}

client.close();
