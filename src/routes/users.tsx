import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Badge, Btn, Card, Empty, Field, inputCls, Modal, PageHeader, Table, Td } from "@/components/qa/ui";
import { useQa, uid } from "@/lib/qa/store";
import type { Role, User } from "@/lib/qa/types";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "Users & Roles | QA Delivery Intelligence" },
      { name: "description", content: "Manage QA team members, roles and project assignments." },
      { property: "og:title", content: "Users & Roles" },
      { property: "og:description", content: "Manage QA team members, roles and project assignments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UsersPage,
});

const ROLES: Role[] = ["Admin", "Portfolio Manager", "Dev Manager", "QA Manager", "Dev Engineer", "QA Engineer"];

const empty = (): User => ({
  id: uid("u"),
  name: "",
  email: "",
  role: "QA Engineer",
  status: "Active",
  assignedProjects: [],
  theme: "light",
});

function UsersPage() {
  const { state, update, log } = useQa();
  const [form, setForm] = useState<User | null>(null);

  function save() {
    if (!form || !form.name.trim()) return;
    update((s) => ({
      ...s,
      users: s.users.some((u) => u.id === form.id) ? s.users.map((u) => (u.id === form.id ? form : u)) : [...s.users, form],
    }));
    log(`Saved user ${form.name}`);
    setForm(null);
  }

  function remove(u: User) {
    if (u.id === state.currentUserId) {
      alert("You cannot delete the acting user.");
      return;
    }
    if (!confirm(`Remove ${u.name}?`)) return;
    update((s) => ({ ...s, users: s.users.filter((x) => x.id !== u.id) }));
    log(`Removed user ${u.name}`);
  }

  function toggleProject(name: string) {
    if (!form) return;
    setForm({
      ...form,
      assignedProjects: form.assignedProjects.includes(name)
        ? form.assignedProjects.filter((p) => p !== name)
        : [...form.assignedProjects, name],
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Users & Roles"
        subtitle="Team members and their access"
        actions={<Btn onClick={() => setForm(empty())}>+ New user</Btn>}
      />
      <Card title={`${state.users.length} users`}>
        <Table head={["Name", "Email", "Role", "Status", "Projects", ""]}>
          {state.users.map((u) => (
            <tr key={u.id} className="border-b border-border last:border-0">
              <Td className="font-semibold">{u.name}</Td>
              <Td>{u.email}</Td>
              <Td>
                <Badge tone="blue">{u.role}</Badge>
              </Td>
              <Td>
                <Badge tone={u.status === "Active" ? "green" : "muted"}>{u.status}</Badge>
              </Td>
              <Td>{u.assignedProjects.length ? u.assignedProjects.join(", ") : "All"}</Td>
              <Td>
                <div className="flex gap-1.5">
                  <Btn variant="ghost" onClick={() => setForm(u)}>
                    Edit
                  </Btn>
                  <Btn variant="ghost" onClick={() => remove(u)}>
                    Remove
                  </Btn>
                </div>
              </Td>
            </tr>
          ))}
          {!state.users.length && (
            <tr>
              <td colSpan={6}>
                <Empty text="No users yet." />
              </td>
            </tr>
          )}
        </Table>
      </Card>

      {form && (
        <Modal
          open
          title={state.users.some((u) => u.id === form.id) ? "Edit user" : "New user"}
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
            <Field label="Email">
              <input className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Role">
              <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                {ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {["Active", "Inactive"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-3">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Assigned projects</p>
            <div className="flex flex-wrap gap-2">
              {state.projects.map((p) => (
                <label key={p.id} className="flex items-center gap-1.5 rounded border border-border px-2 py-1 text-[11.5px]">
                  <input
                    type="checkbox"
                    checked={form.assignedProjects.includes(p.name)}
                    onChange={() => toggleProject(p.name)}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
