import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const WORKSPACE = "default";

export const getDbStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { pingDb } = await import("@/lib/db/pg.server");
  const r = await pingDb();
  return { connected: r.connected, error: r.error ?? null, version: r.version ?? null };
});

/** Returns the stored state as a JSON string (null when Postgres is not configured). */
export const loadQaState = createServerFn({ method: "GET" }).handler(async () => {
  const { readState, databaseUrl } = await import("@/lib/db/pg.server");
  if (!databaseUrl()) return { enabled: false, json: null as string | null };
  try {
    const state = await readState(WORKSPACE);
    return { enabled: true, json: state ? JSON.stringify(state) : null };
  } catch {
    return { enabled: false, json: null as string | null };
  }
});

export const saveQaState = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ json: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { writeState, databaseUrl } = await import("@/lib/db/pg.server");
    if (!databaseUrl()) return { saved: false, error: null as string | null };
    try {
      await writeState(WORKSPACE, JSON.parse(data.json));
      return { saved: true, error: null as string | null };
    } catch (e) {
      return { saved: false, error: e instanceof Error ? e.message : String(e) };
    }
  });
