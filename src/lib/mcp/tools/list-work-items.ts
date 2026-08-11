import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fetchProjectItems, type Metric } from "@/lib/azure.server";

const METRICS = [
  "stale",
  "overdue",
  "critical",
  "bugs",
  "risks",
  "productBugs",
  "all",
] as const satisfies readonly Metric[];

export default defineTool({
  name: "list_work_items",
  title: "List work items",
  description: "List the underlying Azure DevOps work items behind a project metric, such as stale tasks, overdue tasks, critical bugs or open risks.",
  inputSchema: {
    project: z.string().min(1).describe("Azure DevOps project name."),
    metric: z.enum(METRICS).describe("Which metric's work items to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ project, metric }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const items = await fetchProjectItems(project, metric as Metric);
    return {
      content: [{ type: "text", text: JSON.stringify(items, null, 2) }],
      structuredContent: { count: items.length, items },
    };
  },
});
