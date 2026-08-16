import { createServerFn } from "@tanstack/react-start";
import type { GeneratedCase } from "./ai.server";

export type GenerateResult = { ok: true; cases: GeneratedCase[] } | { ok: false; error: string };

export const generateTestCases = createServerFn({ method: "POST" })
  .inputValidator((data: { prompt: string; count: number; moduleName: string; projectName: string; core: string }) => data)
  .handler(async ({ data }): Promise<GenerateResult> => {
    try {
      const { generateCases } = await import("./ai.server");
      return { ok: true, cases: await generateCases(data) };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  });
