import { Link, useRouterState } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { useQa } from "@/lib/qa/store";
import { scopedDefects, scopedTestCases } from "@/lib/qa/compute";

interface NavItem {
  to: string;
  label: string;
  badge?: (n: { tc: number; defects: number; tasks: number }) => number;
  tag?: string;
}

const NAV: { section: string; items: NavItem[] }[] = [
  { section: "Overview", items: [{ to: "/", label: "Dashboard" }] },
  {
    section: "Test Management",
    items: [
      { to: "/testcases", label: "Test Cases", badge: (n) => n.tc },
      { to: "/testplans", label: "Test Plans" },
      { to: "/execution", label: "Execution" },
      { to: "/tasks", label: "Task Assignments", badge: (n) => n.tasks },
    ],
  },
  {
    section: "Analytics",
    items: [
      { to: "/portfolio", label: "Portfolio RAG" },
      { to: "/projecthealth", label: "Project Health", tag: "Azure" },
      { to: "/modules", label: "Module Register" },
      { to: "/rtm", label: "Requirement Coverage" },
      { to: "/risks", label: "Risk & SLA" },
      { to: "/defects", label: "Defects", badge: (n) => n.defects },
      { to: "/gonogo", label: "Go/No-Go Gate" },
    ],
  },
  { section: "Intelligence", items: [{ to: "/recommendations", label: "Recommendations" }] },
  {
    section: "Administration",
    items: [
      { to: "/projects", label: "Projects" },
      { to: "/users", label: "Users & Roles" },
      { to: "/adminbackend", label: "Admin Backend" },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { state, set, currentUser, reset } = useQa();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [navOpen, setNavOpen] = useState(false);

  const counts = useMemo(
    () => ({
      tc: scopedTestCases(state).length,
      defects: scopedDefects(state).filter((d) => d.status !== "Closed").length,
      tasks: state.tasks.filter((t) => t.status !== "Completed").length,
    }),
    [state],
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 bg-topbar px-4 py-2.5 text-topbar-foreground">
        <div className="flex items-center gap-3">
          <button
            className="rounded border border-white/20 px-2 py-1 text-xs md:hidden"
            onClick={() => setNavOpen((o) => !o)}
            aria-label="Toggle navigation"
          >
            ☰
          </button>
          <span className="text-[15px] font-black tracking-tight">
            QA DELIVERY<span className="text-brand">INTEL</span>
          </span>
          <span className="hidden rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold sm:inline">v7.0</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={state.currentProject}
            onChange={(e) => set("currentProject", e.target.value)}
            className="rounded border border-white/20 bg-white/10 px-2 py-1 text-[11.5px] font-medium text-topbar-foreground"
            aria-label="Active project"
          >
            <option value="All" className="text-foreground">
              All projects
            </option>
            {state.projects.map((p) => (
              <option key={p.id} value={p.name} className="text-foreground">
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={state.currentUserId}
            onChange={(e) => set("currentUserId", e.target.value)}
            className="rounded border border-white/20 bg-white/10 px-2 py-1 text-[11.5px] font-medium text-topbar-foreground"
            aria-label="Acting user"
          >
            {state.users.map((u) => (
              <option key={u.id} value={u.id} className="text-foreground">
                {u.name} · {u.role}
              </option>
            ))}
          </select>
          <span className="hidden text-[11px] text-topbar-foreground/70 lg:inline">{currentUser.email}</span>
        </div>
      </header>

      <div className="flex">
        <aside
          className={`${
            navOpen ? "block" : "hidden"
          } w-full shrink-0 border-r border-sidebar-border bg-sidebar px-2 py-3 text-sidebar-foreground md:block md:w-56`}
        >
          {NAV.map((group) => (
            <div key={group.section} className="mb-3">
              <p className="px-2 py-1 text-[9.5px] font-bold uppercase tracking-widest text-sidebar-foreground/45">
                {group.section}
              </p>
              {group.items.map((item) => {
                const active = pathname === item.to;
                const badge = item.badge?.(counts);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setNavOpen(false)}
                    className={`mb-0.5 flex items-center justify-between gap-2 rounded px-2 py-1.5 text-[12px] font-medium transition ${
                      active
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {item.label}
                      {item.tag && (
                        <span className="rounded bg-rag-blue-bg px-1 py-px text-[8.5px] font-bold text-rag-blue">
                          {item.tag}
                        </span>
                      )}
                    </span>
                    {badge ? (
                      <span className="rounded bg-white/10 px-1.5 py-px text-[10px] font-bold">{badge}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
          <button
            onClick={() => {
              if (confirm("Reset all local QA data back to the demo dataset?")) reset();
            }}
            className="mt-2 w-full rounded border border-sidebar-border px-2 py-1.5 text-[11.5px] font-semibold text-sidebar-foreground/80 hover:bg-sidebar-accent"
          >
            ↻ Reset demo data
          </button>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-4">{children}</main>
      </div>
    </div>
  );
}
