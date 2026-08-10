import { type ReactNode } from "react";
import { STATUS_TONE } from "@/lib/qa/compute";

export type Tone = "green" | "amber" | "red" | "blue" | "purple" | "teal" | "muted";

const toneCls: Record<Tone, string> = {
  green: "bg-rag-green-bg text-rag-green",
  amber: "bg-rag-amber-bg text-rag-amber",
  red: "bg-rag-red-bg text-rag-red",
  blue: "bg-rag-blue-bg text-rag-blue",
  purple: "bg-tone-purple-bg text-tone-purple",
  teal: "bg-tone-teal-bg text-tone-teal",
  muted: "bg-muted text-muted-foreground",
};

export function Badge({
  children,
  tone,
  dot,
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  const t = tone ?? (typeof children === "string" ? (STATUS_TONE[children] ?? "muted") : "muted");
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-semibold ${toneCls[t]} ${className}`}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Card({
  title,
  actions,
  children,
  className = "",
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-md border border-border bg-card shadow-xs ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</h2>
          {actions}
        </div>
      )}
      <div className="p-3.5">{children}</div>
    </div>
  );
}

export function Kpi({
  label,
  value,
  sub,
  tone = "blue",
  onClick,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  onClick?: () => void;
}) {
  const bar: Record<Tone, string> = {
    green: "border-l-rag-green",
    amber: "border-l-rag-amber",
    red: "border-l-rag-red",
    blue: "border-l-rag-blue",
    purple: "border-l-tone-purple",
    teal: "border-l-tone-teal",
    muted: "border-l-border",
  };
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={`block w-full border border-l-4 border-border bg-card px-4 py-3 text-left ${bar[tone]} rounded-md ${
        onClick ? "transition hover:shadow-sm" : ""
      }`}
    >
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold leading-none text-foreground">{value}</p>
      {sub && <p className="mt-1.5 text-[11px] text-muted-foreground">{sub}</p>}
    </Comp>
  );
}

export function PageHeader({
  icon,
  title,
  subtitle,
  actions,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-base font-bold text-foreground">
          {icon}
          {title}
        </h1>
        {subtitle && <p className="mt-0.5 text-[11.5px] text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Btn({
  children,
  onClick,
  variant = "secondary",
  size = "sm",
  type = "button",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const v = {
    primary: "bg-primary text-primary-foreground hover:brightness-110",
    secondary: "border border-border bg-card text-foreground hover:bg-accent",
    danger: "bg-rag-red text-white hover:brightness-110",
    ghost: "text-muted-foreground hover:bg-accent",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded font-semibold transition disabled:opacity-50 ${
        size === "sm" ? "px-2.5 py-1.5 text-[11.5px]" : "px-3.5 py-2 text-sm"
      } ${v} ${className}`}
    >
      {children}
    </button>
  );
}

export function Table({
  head,
  children,
  minWidth = 900,
}: {
  head: ReactNode[];
  children: ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-border bg-secondary/60 text-[10.5px] uppercase tracking-wider text-muted-foreground">
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-[12.5px]">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`border-b border-border px-3 py-2 align-middle ${className}`}>{children}</td>;
}

export function Empty({ text }: { text: string }) {
  return <div className="px-3 py-10 text-center text-[12.5px] text-muted-foreground">{text}</div>;
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4 py-10"
      onClick={onClose}
    >
      <div
        className={`w-full rounded-md border border-border bg-card shadow-lg ${wide ? "max-w-4xl" : "max-w-xl"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-lg leading-none text-muted-foreground hover:text-foreground">
            ×
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded border border-input bg-background px-2.5 py-1.5 text-[12.5px] text-foreground outline-none focus:border-ring";

export function Progress({ pct, tone = "green" }: { pct: number; tone?: Tone }) {
  const bg: Record<Tone, string> = {
    green: "bg-rag-green",
    amber: "bg-rag-amber",
    red: "bg-rag-red",
    blue: "bg-rag-blue",
    purple: "bg-tone-purple",
    teal: "bg-tone-teal",
    muted: "bg-muted-foreground",
  };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${bg[tone]}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-1 border-b border-border">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`-mb-px border-b-2 px-3 py-2 text-[12px] font-semibold transition ${
            active === t.id
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
