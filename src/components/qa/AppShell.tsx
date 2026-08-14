import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Activity,
  BarChart3,
  Boxes,
  Bug,
  ClipboardList,
  Cog,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  Library,
  ListChecks,
  PlayCircle,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useQa } from "@/lib/qa/store";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  tag?: string;
}

const NAV: { section: string; items: NavItem[] }[] = [
  { section: "Overview", items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    section: "Test Management",
    items: [
      { to: "/modules", label: "Modules", icon: Boxes },
      { to: "/testcases", label: "Test Cases", icon: ListChecks },
      { to: "/repository", label: "COE Repository", icon: Library },
      { to: "/testplans", label: "Test Plans", icon: ClipboardList },
      { to: "/execution", label: "Execution", icon: PlayCircle },
      { to: "/tasks", label: "Task Assignments", icon: FlaskConical },
    ],
  },
  {
    section: "Analytics",
    items: [
      { to: "/portfolio", label: "Portfolio RAG", icon: BarChart3 },
      { to: "/projecthealth", label: "Project Health", icon: Activity, tag: "Azure" },
      { to: "/rtm", label: "Requirement Coverage", icon: Target },
      { to: "/risks", label: "Risk & SLA", icon: ShieldAlert },
      { to: "/defects", label: "Defects", icon: Bug },
      { to: "/gonogo", label: "Go/No-Go Gate", icon: Gauge },
    ],
  },
  { section: "Intelligence", items: [{ to: "/recommendations", label: "Recommendations", icon: Sparkles }] },
  {
    section: "Administration",
    items: [
      { to: "/projects", label: "Projects", icon: Boxes },
      { to: "/users", label: "Users & Roles", icon: Users },
      { to: "/adminbackend", label: "Admin Backend", icon: Cog },
    ],
  },
];

const selectCls =
  "rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11.5px] font-semibold text-topbar-foreground outline-none transition hover:bg-white/20 focus:border-white/40";

export function AppShell({ children }: { children: ReactNode }) {
  const { state, set, currentUser, reset } = useQa();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-topbar px-4 py-2.5 text-topbar-foreground shadow-lg">
        <div className="flex items-center gap-3">
          <button
            className="rounded-lg border border-white/20 px-2 py-1 text-xs transition active:scale-95 md:hidden"
            onClick={() => setNavOpen((o) => !o)}
            aria-label="Toggle navigation"
          >
            ☰
          </button>
          <span className="flex items-center gap-2 text-[15px] font-black tracking-tight">
            <span className="press-3d inline-flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FlaskConical className="size-4" />
            </span>
            QA DELIVERY<span className="text-brand">INTEL</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={state.currentProject}
            onChange={(e) => set("currentProject", e.target.value)}
            className={selectCls}
            aria-label="Active project"
          >
            <option value="All" className="text-foreground">
              All projects
            </option>
            {state.projects.map((p) => (
              <option key={p.id} value={p.name} className="text-foreground">
                {p.name} · {p.core}
              </option>
            ))}
          </select>
          <select
            value={state.currentUserId}
            onChange={(e) => set("currentUserId", e.target.value)}
            className={selectCls}
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
          } w-full shrink-0 border-r border-sidebar-border bg-sidebar px-2.5 py-3 text-sidebar-foreground md:block md:w-60`}
        >
          {NAV.map((group) => (
            <div key={group.section} className="mb-3">
              <p className="px-2 py-1 text-[9.5px] font-bold uppercase tracking-widest text-sidebar-foreground/45">
                {group.section}
              </p>
              {group.items.map((item) => {
                const active = pathname === item.to;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setNavOpen(false)}
                    className={`mb-1 flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[12px] font-semibold transition duration-200 hover:translate-x-0.5 ${
                      active
                        ? "bg-primary text-primary-foreground shadow-[0_6px_16px_-8px_var(--primary)]"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="size-4 shrink-0" />
                      {item.label}
                    </span>
                    {item.tag && (
                      <span className="rounded bg-white/15 px-1.5 py-px text-[8.5px] font-bold uppercase">
                        {item.tag}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
          <button
            onClick={() => {
              if (confirm("Reset all local QA data back to the demo dataset?")) reset();
            }}
            className="press-3d mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-sidebar-border px-2 py-2 text-[11.5px] font-semibold text-sidebar-foreground/80"
          >
            <RotateCcw className="size-3.5" /> Reset demo data
          </button>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-5">{children}</main>
      </div>
    </div>
  );
}
