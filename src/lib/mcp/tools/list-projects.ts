import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { fetchDashboard } from "@/lib/azure.server";

export default defineTool({
  name: "list_projects",
  title: "List Azure projects",
  description:
    "List every Azure DevOps project tracked by this app with its RAG status, schedule progress, open bugs, risks and phase.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const data = await fetchDashboard();
    return {
      content: [{ type: "text", text: JSON.stringify(data.projects, null, 2) }],
      structuredContent: { projects: data.projects, generatedAt: data.generatedAt },
    };
  },
});
