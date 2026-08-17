// Server-only Postgres layer.
// Configuration is a single environment variable: DATABASE_URL
// e.g. postgres://qa:qa@localhost:5432/qa
// If it is not set, the app silently falls back to browser storage.
import { Pool } from "pg";

let pool: Pool | undefined;
let ready: Promise<void> | undefined;

export function databaseUrl(): string | undefined {
  const url = process.env["DATABASE_URL"];
  return url && url.trim().length > 0 ? url.trim() : undefined;
}

function getPool(): Pool {
  if (!pool) {
    const url = databaseUrl();
    if (!url) throw new Error("DATABASE_URL is not configured");
    pool = new Pool({
      connectionString: url,
      max: 5,
      ssl: /sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

const SCHEMA = `
create table if not exists qa_state (
  workspace   text primary key,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);
`;

async function ensureSchema() {
  if (!ready) {
    ready = getPool()
      .query(SCHEMA)
      .then(() => undefined)
      .catch((e) => {
        ready = undefined;
        throw e;
      });
  }
  return ready;
}

export async function pingDb(): Promise<{ connected: boolean; error?: string | undefined; version?: string | undefined }> {
  if (!databaseUrl()) return { connected: false, error: "DATABASE_URL not set" };
  try {
    await ensureSchema();
    const r = await getPool().query<{ version: string }>("select version() as version");
    return { connected: true, version: r.rows[0]?.version?.split(",")[0] };
  } catch (e) {
    return { connected: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function readState(workspace: string): Promise<unknown | null> {
  if (!databaseUrl()) return null;
  await ensureSchema();
  const r = await getPool().query<{ data: unknown }>(
    "select data from qa_state where workspace = $1",
    [workspace],
  );
  return r.rows[0]?.data ?? null;
}

export async function writeState(workspace: string, data: unknown): Promise<void> {
  if (!databaseUrl()) return;
  await ensureSchema();
  await getPool().query(
    `insert into qa_state (workspace, data, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (workspace) do update set data = excluded.data, updated_at = now()`,
    [workspace, JSON.stringify(data)],
  );
}
