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

function AdminPage() {
  const { state, update, log, reset } = useQa();
  const s = state.settings;

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
