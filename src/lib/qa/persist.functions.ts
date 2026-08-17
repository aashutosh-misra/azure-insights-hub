import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const WORKSPACE = "default";

export const getDbStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { pingDb } = await import("@/lib/db/pg.server");
  return pingDb();
});

export const loadQaState = createServerFn({ method: "GET" }).handler(async () => {
  const { readState, databaseUrl } = await import("@/lib/db/pg.server");
  if (!databaseUrl()) return { enabled: false as const, state: null };
  try {
    const state = await readState(WORKSPACE);
    return { enabled: true as const, state };
  } catch {
    return { enabled: false as const, state: null };
  }
});

export const saveQaState = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ state: z.unknown() }).parse(data))
  .handler(async ({ data }) => {
    const { writeState, databaseUrl } = await import("@/lib/db/pg.server");
    if (!databaseUrl()) return { saved: false as const };
    try {
      await writeState(WORKSPACE, data.state);
      return { saved: true as const };
    } catch (e) {
      return { saved: false as const, error: e instanceof Error ? e.message : String(e) };
    }
  });
