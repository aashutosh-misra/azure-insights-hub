import { createServerFn } from "@tanstack/react-start";
import type { DashboardData } from "./azure.server";

export type DashboardResult =
  | { ok: true; data: DashboardData }
  | { ok: false; error: string };

export const getAzureDashboard = createServerFn({ method: "GET" }).handler(
  async (): Promise<DashboardResult> => {
    try {
      const { fetchDashboard } = await import("./azure.server");
      return { ok: true, data: await fetchDashboard() };
    } catch (err) {
      console.error("getAzureDashboard failed", err);
      return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  },
);
