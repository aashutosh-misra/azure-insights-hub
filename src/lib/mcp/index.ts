import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listProjects from "./tools/list-projects";
import getProjectHealth from "./tools/get-project-health";
import listWorkItems from "./tools/list-work-items";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "azure-insights-hub",
  title: "Azure Insights Hub",
  version: "0.1.0",
  instructions:
    "Tools for Azure Insights Hub, a QA delivery and Azure DevOps project health app. Use `list_projects` for a portfolio overview, `get_project_health` for one project, and `list_work_items` to drill into the work items behind a metric.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listProjects, getProjectHealth, listWorkItems] as never,
});
