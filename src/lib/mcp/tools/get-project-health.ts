import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fetchDashboard } from "@/lib/azure.server";

export default defineTool({
  name: "get_project_health",
  title: "Get project health",
  description: "Get the full health snapshot for one Azure DevOps project by name (RAG, schedule, stale/overdue tasks, bugs, risks).",
  inputSchema: { project: z.string().min(1).describe("Azure DevOps project name.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ project }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const data = await fetchDashboard();
    const match = data.projects.find((p) => p.name.toLowerCase() === project.toLowerCase());
    if (!match) {
      throw new ToolError(`No project named "${project}". Known projects: ${data.projects.map((p) => p.name).join(", ")}`);
    }
    return {
      content: [{ type: "text", text: JSON.stringify(match, null, 2) }],
      structuredContent: { project: match },
    };
  },
});
