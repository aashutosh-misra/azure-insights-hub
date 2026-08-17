import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Btn, Card, Empty, Field, inputCls, PageHeader, Table, Td } from "@/components/qa/ui";
import { fmtDate } from "@/lib/qa/compute";
import { useQa } from "@/lib/qa/store";
import { getDbStatus } from "@/lib/qa/persist.functions";


export const Route = createFileRoute("/adminbackend")({
  head: () => ({
    meta: [
      { title: "Admin Backend | QA Delivery Intelligence" },
      { name: "description", content: "Platform settings, SSO configuration, data maintenance and the activity audit log." },
      { property: "og:title", content: "Admin Backend" },
      { property: "og:description", content: "Platform settings, SSO configuration and audit log." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

type DbStatus = { connected: boolean; error: string | null; version: string | null };

function AdminPage() {
  const { state, update, log, reset, storage } = useQa();
  const s = state.settings;
  const [db, setDb] = useState<DbStatus | null>(null);
  const [checking, setChecking] = useState(false);

  async function checkDb() {
    setChecking(true);
    try {
      setDb(await getDbStatus());
    } catch (e) {
      setDb({ connected: false, error: e instanceof Error ? e.message : String(e), version: null });
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    void checkDb();
  }, []);

  function setSetting<K extends keyof typeof s>(key: K, value: (typeof s)[K]) {
    update((st) => ({ ...st, settings: { ...st.settings, [key]: value } }));
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `qa-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    log("Exported application data");
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Admin Backend" subtitle="Platform configuration and audit trail" />

      <Card
        title="Database"
        actions={
          <Btn onClick={() => void checkDb()} disabled={checking}>
            {checking ? "Checking…" : "Test connection"}
          </Btn>
        }
      >
        <div className="space-y-2 text-[12px]">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium ${
                db?.connected
                  ? "bg-emerald-500/15 text-emerald-600"
                  : "bg-amber-500/15 text-amber-600"
              }`}
            >
              <span className={`size-2 rounded-full ${db?.connected ? "bg-emerald-500" : "bg-amber-500"}`} />
              {db == null
                ? "Checking database…"
                : db.connected
                  ? `Connected — ${db.version ?? "PostgreSQL"}`
                  : "Not connected"}
            </span>
            <span className="text-muted-foreground">
              Data is being saved to{" "}
              <strong>{storage === "postgres" ? "the shared PostgreSQL database" : "this browser only (demo mode)"}</strong>
              .
            </span>
          </div>
          {db && !db.connected && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">{db.error}</p>
          )}
          <p className="text-muted-foreground">
            To connect a database, set <code className="rounded bg-muted px-1">DATABASE_URL</code> in the{" "}
            <code className="rounded bg-muted px-1">.env</code> file (format:{" "}
            <code className="rounded bg-muted px-1">postgres://user:password@host:5432/dbname</code>) and restart the
            app. Full instructions are in <strong>SETUP.md</strong>.
          </p>
        </div>
      </Card>




      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Platform settings">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Session timeout (mins)">
              <input
                type="number"
                className={inputCls}
                value={s.sessionTimeoutMins}
                onChange={(e) => setSetting("sessionTimeoutMins", Number(e.target.value))}
              />
            </Field>
            <Field label="Azure stale threshold (days)">
              <input
                type="number"
                className={inputCls}
                value={s.azureStaleThresholdDays}
                onChange={(e) => setSetting("azureStaleThresholdDays", Number(e.target.value))}
              />
            </Field>
            <Field label="Maintenance mode">
              <select
                className={inputCls}
                value={s.maintenanceMode ? "on" : "off"}
                onChange={(e) => setSetting("maintenanceMode", e.target.value === "on")}
              >
                <option value="off">Off</option>
                <option value="on">On</option>
              </select>
            </Field>
            <Field label="Maintenance message">
              <input className={inputCls} value={s.maintenanceMsg} onChange={(e) => setSetting("maintenanceMsg", e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card title="Single sign-on">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="SSO enabled">
              <select
                className={inputCls}
                value={s.ssoEnabled ? "on" : "off"}
                onChange={(e) => setSetting("ssoEnabled", e.target.value === "on")}
              >
                <option value="off">Off</option>
                <option value="on">On</option>
              </select>
            </Field>
            <Field label="Provider">
              <input className={inputCls} value={s.ssoProvider} onChange={(e) => setSetting("ssoProvider", e.target.value)} />
            </Field>
            <Field label="Client ID">
              <input className={inputCls} value={s.ssoClientId} onChange={(e) => setSetting("ssoClientId", e.target.value)} />
            </Field>
            <Field label="Tenant">
              <input className={inputCls} value={s.ssoTenant} onChange={(e) => setSetting("ssoTenant", e.target.value)} />
            </Field>
          </div>
        </Card>
      </div>

      <Card
        title="Data maintenance"
        actions={
          <div className="flex gap-2">
            <Btn onClick={exportData}>Export JSON</Btn>
            <Btn
              variant="danger"
              onClick={() => {
                if (confirm("Reset all local QA data back to the demo dataset?")) reset();
              }}
            >
              Reset demo data
            </Btn>
          </div>
        }
      >
        <p className="text-[12px] text-muted-foreground">
          QA data is stored locally in this browser. Export a snapshot before resetting.
        </p>
      </Card>

      <Card title="Activity log">
        <Table head={["When", "User", "Action"]} minWidth={600}>
          {state.activity.slice(0, 40).map((a) => (
            <tr key={a.id} className="border-b border-border last:border-0">
              <Td>{fmtDate(a.ts)}</Td>
              <Td>{a.user}</Td>
              <Td>{a.action}</Td>
            </tr>
          ))}
          {!state.activity.length && (
            <tr>
              <td colSpan={3}>
                <Empty text="No activity recorded yet." />
              </td>
            </tr>
          )}
        </Table>
      </Card>
    </div>
  );
}
