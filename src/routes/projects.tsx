import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Badge, Btn, Card, Empty, Field, inputCls, Modal, PageHeader, Table, Td } from "@/components/qa/ui";
import { fmtDate } from "@/lib/qa/compute";
import { useQa, uid } from "@/lib/qa/store";
import type { Project } from "@/lib/qa/types";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects | QA Delivery Intelligence" },
      { name: "description", content: "Create and manage delivery projects, owners, status and timelines." },
      { property: "og:title", content: "Projects" },
      { property: "og:description", content: "Create and manage delivery projects, owners, status and timelines." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectsPage,
});

const empty = (): Project => ({
  id: uid("p"),
  name: "",
  desc: "",
  owner: "",
  status: "Active",
  start: "",
  end: "",
});

function ProjectsPage() {
  const { state, update, log } = useQa();
  const [form, setForm] = useState<Project | null>(null);

  function save() {
    if (!form || !form.name.trim()) return;
    update((s) => ({
      ...s,
      projects: s.projects.some((p) => p.id === form.id)
        ? s.projects.map((p) => (p.id === form.id ? form : p))
        : [...s.projects, form],
    }));
    log(`Saved project ${form.name}`);
    setForm(null);
  }

  function remove(p: Project) {
    if (!confirm(`Delete project ${p.name}?`)) return;
    update((s) => ({ ...s, projects: s.projects.filter((x) => x.id !== p.id) }));
    log(`Deleted project ${p.name}`);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Projects"
        subtitle="Delivery projects in scope"
        actions={<Btn onClick={() => setForm(empty())}>+ New project</Btn>}
      />
      <Card title={`${state.projects.length} projects`}>
        <Table head={["Project", "Owner", "Status", "Start", "End", "Modules", ""]}>
          {state.projects.map((p) => (
            <tr key={p.id} className="border-b border-border last:border-0">
              <Td>
                <span className="font-semibold">{p.name}</span>
                <span className="block text-[11px] text-muted-foreground">{p.desc}</span>
              </Td>
              <Td>{p.owner || "—"}</Td>
              <Td>
                <Badge tone={p.status === "Active" ? "green" : "muted"}>{p.status}</Badge>
              </Td>
              <Td>{p.start ? fmtDate(p.start) : "—"}</Td>
              <Td>{p.end ? fmtDate(p.end) : "—"}</Td>
              <Td>{state.modules.filter((m) => m.proj === p.name).length}</Td>
              <Td>
                <div className="flex gap-1.5">
                  <Btn variant="ghost" onClick={() => setForm(p)}>
                    Edit
                  </Btn>
                  <Btn variant="ghost" onClick={() => remove(p)}>
                    Delete
                  </Btn>
                </div>
              </Td>
            </tr>
          ))}
          {!state.projects.length && (
            <tr>
              <td colSpan={7}>
                <Empty text="No projects yet." />
              </td>
            </tr>
          )}
        </Table>
      </Card>

      {form && (
        <Modal
          title={state.projects.some((p) => p.id === form.id) ? "Edit project" : "New project"}
          onClose={() => setForm(null)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setForm(null)}>
                Cancel
              </Btn>
              <Btn onClick={save}>Save</Btn>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Owner">
              <input className={inputCls} value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
            </Field>
            <Field label="Status">
              <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {["Active", "On Hold", "Completed"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Start">
              <input type="date" className={inputCls} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            </Field>
            <Field label="End">
              <input type="date" className={inputCls} value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <textarea className={inputCls} rows={3} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
