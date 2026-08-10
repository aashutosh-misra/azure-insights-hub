import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getAzureDashboard } from "@/lib/azure.functions";
import type { Metric, ProjectHealth, Rag } from "@/lib/azure.server";
import { WorkItemsDialog, type Drill } from "@/components/WorkItemsDialog";

export const Route = createFileRoute("/projecthealth")({
  head: () => ({
    meta: [
      { title: "US Project Health Dashboard | Azure Boards RAG Tracker" },
      {
        name: "description",
        content:
          "Live delivery intelligence dashboard: RAG status, stale and overdue tasks, bugs and risks pulled straight from Azure DevOps Boards.",
      },
      { property: "og:title", content: "US Project Health Dashboard" },
      {
        property: "og:description",
        content: "Live RAG health, stale tasks, overdue work, bugs and risks from Azure DevOps Boards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const ragStyles: Record<Rag, string> = {
  GREEN: "bg-rag-green-bg text-rag-green",
  AMBER: "bg-rag-amber-bg text-rag-amber",
  RED: "bg-rag-red-bg text-rag-red",
};

function RagPill({ rag }: { rag: Rag }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wide ${ragStyles[rag]}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {rag}
    </span>
  );
}

function Chip({
  children,
  tone = "muted",
  onClick,
}: {
  children: React.ReactNode;
  tone?: "muted" | "green" | "amber" | "red" | "blue";
  onClick?: () => void;
}) {
  const tones = {
    muted: "bg-muted text-muted-foreground",
    green: "bg-rag-green-bg text-rag-green",
    amber: "bg-rag-amber-bg text-rag-amber",
    red: "bg-rag-red-bg text-rag-red",
    blue: "bg-rag-blue-bg text-rag-blue",
  } as const;
  const cls = `inline-block rounded-md px-2 py-1 text-xs font-medium ${tones[tone]}`;
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${cls} cursor-pointer transition hover:brightness-95 hover:ring-1 hover:ring-current/40`}
      >
        {children}
      </button>
    );
  }
  return <span className={cls}>{children}</span>;
}

function KpiCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number | string;
  hint: string;
  accent: "green" | "amber" | "red" | "blue";
}) {
  const bar = {
    green: "border-l-rag-green bg-rag-green-bg",
    amber: "border-l-rag-amber bg-rag-amber-bg",
    red: "border-l-rag-red bg-rag-red-bg",
    blue: "border-l-rag-blue bg-rag-blue-bg",
  }[accent];
  return (
    <div className={`border-l-4 px-5 py-4 ${bar}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Row({ p, onDrill }: { p: ProjectHealth; onDrill: (d: Drill) => void }) {
  const [open, setOpen] = useState(false);
  const drill = (metric: Metric, label: string) => () => onDrill({ project: p.name, metric, label });
  return (
    <>
      <tr className="border-b border-border align-top">
        <td className="px-4 py-4">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-start gap-2 text-left"
            aria-expanded={open}
          >
            <span className="mt-1 text-muted-foreground">{open ? "▾" : "›"}</span>
            <span>
              <span className="block text-sm font-semibold uppercase text-rag-red">{p.name}</span>
              <span className="block text-xs text-muted-foreground">{p.processTemplate}</span>
            </span>
          </button>
        </td>
        <td className="px-4 py-4">
          <button type="button" onClick={drill("all", "All open work items")} className="cursor-pointer">
            <RagPill rag={p.calcRag} />
          </button>
        </td>
        <td className="px-4 py-4">
          <Chip tone={p.schedulePct >= 0 ? "green" : "amber"}>
            {Math.abs(p.schedulePct)}% {p.schedulePct >= 0 ? "ahead of" : "behind"} schedule
          </Chip>
        </td>
        <td className="px-4 py-4">
          <Chip tone={p.staleTasks > 0 ? "amber" : "green"} onClick={drill("stale", "Stale tasks")}>
            {p.staleTasks} stale
          </Chip>
          {p.staleTasks > 0 && <p className="mt-1 text-[11px] text-muted-foreground">14+ days inactive</p>}
        </td>
        <td className="px-4 py-4">
          <Chip tone={p.overdueTasks > 0 ? "red" : "green"} onClick={drill("overdue", "Overdue tasks")}>
            {p.overdueTasks} overdue
          </Chip>
          {p.overdueTasks > 0 && <p className="mt-1 text-[11px] text-muted-foreground">past due date</p>}
        </td>
        <td className="px-4 py-4">
          <Chip
            tone={p.criticalBugs > 0 || p.showstopperBugs > 0 ? "red" : "green"}
            onClick={drill("critical", "Critical & showstopper bugs")}
          >
            Critical: {p.criticalBugs} · SS: {p.showstopperBugs}
          </Chip>
        </td>
        <td className="px-4 py-4">
          <Chip tone={p.openBugs > 0 ? "amber" : "green"} onClick={drill("bugs", "Open bugs")}>
            {p.openBugs} open
          </Chip>
        </td>
        <td className="px-4 py-4">
          <Chip tone={p.openRisks > 0 ? "red" : "green"} onClick={drill("risks", "Open risks & issues")}>
            {p.openRisks} open{p.openRisks > 0 ? ` · H:${p.riskHigh} M:${p.riskMedium}` : " risks"}
          </Chip>
        </td>
        <td className="px-4 py-4">
          <Chip tone={p.productBugs > 0 ? "amber" : "green"} onClick={drill("productBugs", "Product bugs")}>
            {p.productBugs} open
          </Chip>
        </td>
        <td className="px-4 py-4">
          <Chip tone="blue" onClick={drill("all", "All open work items")}>
            {p.phase}
          </Chip>
        </td>
        <td className="px-4 py-4 text-xs text-muted-foreground">
          {p.lastActivity ? new Date(p.lastActivity).toLocaleDateString() : "—"}
        </td>
      </tr>
      {open && (
        <tr className="border-b border-border bg-secondary/60">
          <td colSpan={11} className="px-10 py-4">
            <dl className="grid grid-cols-2 gap-x-10 gap-y-2 text-xs sm:grid-cols-4">
              {[
                ["Project ID", p.id],
                ["Calculated RAG", p.calcRag],
                ["High risks", p.riskHigh],
                ["Medium risks", p.riskMedium],
                ["Showstopper bugs", p.showstopperBugs],
                ["Product-tagged bugs", p.productBugs],
                ["Stale threshold", "14 days without a change"],
                ["Last work item change", p.lastActivity ? new Date(p.lastActivity).toLocaleString() : "—"],
              ].map(([k, v]) => (
                <div key={String(k)}>
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium text-foreground">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </td>
        </tr>
      )}
    </>
  );
}

function Dashboard() {
  const fetchDashboard = useServerFn(getAzureDashboard);
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["azure-dashboard"],
    queryFn: () => fetchDashboard(),
    refetchOnWindowFocus: false,
  });

  const [drill, setDrill] = useState<Drill | null>(null);
  const [rag, setRag] = useState<"ALL" | Rag>("ALL");
  const [search, setSearch] = useState("");

  const projects = data?.ok ? data.data.projects : [];
  const filtered = useMemo(
    () =>
      projects.filter(
        (p) =>
          (rag === "ALL" || p.calcRag === rag) && p.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [projects, rag, search],
  );

  const green = projects.filter((p) => p.calcRag === "GREEN").length;
  const amber = projects.filter((p) => p.calcRag === "AMBER").length;
  const red = projects.filter((p) => p.calcRag === "RED").length;
  const criticalIssues = projects.reduce((n, p) => n + p.criticalBugs + p.showstopperBugs, 0);
  const openBugs = projects.reduce((n, p) => n + p.openBugs, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between bg-topbar px-5 py-3 text-topbar-foreground">
        <div className="flex items-center gap-3">
          <span className="text-lg font-black tracking-tight">
            DELIVERY<span className="text-brand">INTEL</span>
          </span>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-topbar disabled:opacity-60"
        >
          {isFetching ? "Refreshing…" : "↻ Refresh"}
        </button>
      </header>

      <main className="px-5 py-5">
        <h1 className="text-xl font-bold text-foreground">US Project Health Dashboard</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {data?.ok
            ? `Last refreshed: ${new Date(data.data.refreshedAt).toLocaleString()} · Azure Boards · ${
                data.data.organization
              } · ${projects.length} active projects`
            : "Connecting to Azure Boards…"}
        </p>

        {data && !data.ok && (
          <div className="mt-4 rounded-lg border border-rag-amber/40 bg-rag-amber-bg px-4 py-3 text-sm text-rag-amber">
            {data.error}
          </div>
        )}

        <section className="mt-4 grid gap-px overflow-hidden rounded-lg bg-border md:grid-cols-4">
          <div className="bg-card">
            <KpiCard label="Projects on track" value={green} hint={`of ${projects.length} active`} accent="green" />
          </div>
          <div className="bg-card">
            <KpiCard label="At risk" value={amber} hint="AMBER status" accent="amber" />
          </div>
          <div className="bg-card">
            <KpiCard label="Critical issues" value={criticalIssues} hint={`${red} RED status`} accent="red" />
          </div>
          <div className="bg-card">
            <KpiCard label="Open bugs" value={openBugs} hint="Active, not closed" accent="blue" />
          </div>
        </section>

        <section className="mt-4 rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
            <label className="text-xs font-semibold text-muted-foreground">RAG</label>
            <select
              value={rag}
              onChange={(e) => setRag(e.target.value as "ALL" | Rag)}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="ALL">All</option>
              <option value="GREEN">Green</option>
              <option value="AMBER">Amber</option>
              <option value="RED">Red</option>
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search project name…"
              className="min-w-56 flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
            <button
              onClick={() => {
                setRag("ALL");
                setSearch("");
              }}
              className="rounded-md border border-input px-3 py-1.5 text-sm font-medium"
            >
              Clear Filters
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                  {[
                    "Project",
                    "Calc. RAG",
                    "Schedule",
                    "Stale tasks",
                    "Overdue tasks",
                    "Internal quality",
                    "Open bugs",
                    "Risks",
                    "Product bugs",
                    "Phase",
                    "Last activity",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <Row key={p.id} p={p} onDrill={setDrill} />
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      {isFetching ? "Loading Azure Boards data…" : "No projects match these filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
            RAG is calculated from Azure Boards work items: critical/showstopper bugs and 3+ high risks drive RED;
            overdue work, 5+ stale items or open high risks drive AMBER.
          </p>
        </section>
      </main>

      <WorkItemsDialog drill={drill} onClose={() => setDrill(null)} />
    </div>
  );
}
