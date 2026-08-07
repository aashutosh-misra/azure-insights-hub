import { createServerFn } from "@tanstack/react-start";
import type { DashboardData, ItemDetail, Metric } from "./azure.server";

export type DashboardResult =
  | { ok: true; data: DashboardData }
  | { ok: false; error: string };

export type ItemsResult = { ok: true; items: ItemDetail[] } | { ok: false; error: string };

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

export const getProjectItems = createServerFn({ method: "POST" })
  .inputValidator((data: { project: string; metric: Metric }) => data)
  .handler(async ({ data }): Promise<ItemsResult> => {
    try {
      const { fetchProjectItems } = await import("./azure.server");
      return { ok: true, items: await fetchProjectItems(data.project, data.metric) };
    } catch (err) {
      console.error("getProjectItems failed", err);
      return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  });
