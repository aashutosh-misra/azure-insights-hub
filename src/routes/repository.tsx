import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Library, Upload } from "lucide-react";
import { useQa, uid } from "@/lib/qa/store";
import { CORES, EXEC_STATUSES, SEVERITIES } from "@/lib/qa/seed";
import { scopedModules } from "@/lib/qa/compute";
import { ImportDialog } from "@/components/qa/ImportDialog";
import type { ImportField } from "@/lib/qa/import";
import type { Core, LibraryCase, TestCase } from "@/lib/qa/types";
import { Badge, Btn, Card, Empty, Field, inputCls, Modal, PageHeader, Table, Td } from "@/components/qa/ui";

export const Route = createFileRoute("/repository")({
  head: () => ({
    meta: [
      { title: "COE Test Case Repository | QA Delivery Intelligence" },
      {
        name: "description",
        content: "Central core-wise master library of test cases (Symitar, DNA, Keystone, Portico) that can be copied into any project module.",
      },
      { property: "og:title", content: "COE Test Case Repository" },
      { property: "og:description", content: "Core-wise master test case library, copy-ready for project execution." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RepositoryPage,
});

function RepositoryPage() {
  const { state, update, log } = useQa();
  const [core, setCore] = useState<Core | "All">("All");
  const [area, setArea] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copyOpen, setCopyOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importCore, setImportCore] = useState<Core>("Symitar");
  const [targetModuleId, setTargetModuleId] = useState("");

  const areas = useMemo(
    () => Array.from(new Set(state.libraryCases.filter((c) => core === "All" || c.core === core).map((c) => c.area))),
    [state.libraryCases, core],
  );

  const rows = useMemo(
    () =>
      state.libraryCases.filter((c) => {
        if (core !== "All" && c.core !== core) return false;
        if (area !== "All" && c.area !== area) return false;
        if (search && !`${c.title} ${c.tags} ${c.area}`.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [state.libraryCases, core, area, search],
  );

  const modules = scopedModules(state);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function copyToProject() {
    if (!targetModuleId || selected.size === 0) return;
    const picked = state.libraryCases.filter((c) => selected.has(c.id));
    const copies: TestCase[] = picked.map((c) => ({
      id: uid("tc"),
      title: c.title,
      moduleId: targetModuleId,
      type: c.type,
      priority: c.priority,
      assignee: "",
      status: "Not Executed",
      desc: c.desc,
      steps: c.steps,
      expected: c.expected,
      actual: "",
      defect: "",
      createdAt: new Date().toISOString().slice(0, 10),
      automation: "Manual",
      reqIds: [],
      activity: [],
      tags: `${c.tags}${c.tags ? "," : ""}coe:${c.core}`,
    }));
    update((s) => ({ ...s, testCases: [...copies, ...s.testCases] }));
    log(`Copied ${copies.length} COE library case(s) into a project module`);
    setSelected(new Set());
    setCopyOpen(false);
  }

  function publishProjectCases() {
    const project = state.projects.find((p) => p.name === state.currentProject);
    if (!project) {
      alert("Select a single project in the top bar to publish its cases to the library.");
      return;
    }
    const moduleIds = new Set(state.modules.filter((m) => m.proj === project.name).map((m) => m.id));
    const cases = state.testCases.filter((c) => moduleIds.has(c.moduleId));
    if (!cases.length) return;
    const published: LibraryCase[] = cases.map((c) => ({
      id: uid("lc"),
      core: project.core,
      area: state.modules.find((m) => m.id === c.moduleId)?.name ?? "General",
      title: c.title,
      type: c.type,
      priority: c.priority,
      desc: c.desc,
      steps: c.steps,
      expected: c.expected,
      tags: c.tags,
    }));
    update((s) => ({ ...s, libraryCases: [...published, ...s.libraryCases] }));
    log(`Published ${published.length} case(s) from ${project.name} to the ${project.core} library`);
  }

  function importLibrary(records: Record<ImportField, string>[]) {
    const imported: LibraryCase[] = records.map((r) => ({
      id: uid("lc"),
      core: importCore,
      area: r.tags || "General",
      title: r.title ?? "",
      type: r.type || "Functional",
      priority: (SEVERITIES as readonly string[]).includes(r.priority) ? (r.priority as LibraryCase["priority"]) : "Medium",
      desc: r.desc ?? "",
      steps: r.steps ?? "",
      expected: r.expected ?? "",
      tags: r.tags ?? "",
    }));
    update((s) => ({ ...s, libraryCases: [...imported, ...s.libraryCases] }));
    log(`Imported ${imported.length} case(s) into the ${importCore} library`);
  }

  return (
    <div>
      <PageHeader
        icon={<Library className="size-4" />}
        title="COE Test Case Repository"
        subtitle="Core-wise master library. Copy cases into a project module — copies are fully editable and never change the master."
        actions={
          <>
            <Btn onClick={() => setImportOpen(true)}>
              <Upload className="size-3.5" /> Import to library
            </Btn>
            <Btn onClick={publishProjectCases}>Publish project cases</Btn>
            <Btn variant="primary" disabled={selected.size === 0} onClick={() => setCopyOpen(true)}>
              Copy {selected.size || ""} to project
            </Btn>
          </>
        }
      />

      <Card className="mb-3">
        <div className="flex flex-wrap gap-2">
          <input
            className={`${inputCls} max-w-xs`}
            placeholder="Search library…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={`${inputCls} max-w-[170px]`}
            value={core}
            onChange={(e) => {
              setCore(e.target.value as Core | "All");
              setArea("All");
            }}
          >
            <option value="All">All cores</option>
            {CORES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select className={`${inputCls} max-w-[190px]`} value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="All">All areas</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card title={`${rows.length} master case(s)`}>
        {rows.length === 0 ? (
          <Empty text="No library cases match the current filters." />
        ) : (
          <Table head={["", "Core", "Area", "Title", "Type", "Priority", "Tags"]} minWidth={820}>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                <Td>
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                </Td>
                <Td>
                  <Badge tone="purple">{c.core}</Badge>
                </Td>
                <Td>{c.area}</Td>
                <Td className="font-medium">{c.title}</Td>
                <Td>{c.type}</Td>
                <Td>
                  <Badge>{c.priority}</Badge>
                </Td>
                <Td className="text-muted-foreground">{c.tags || "—"}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal
        open={copyOpen}
        title={`Copy ${selected.size} case(s) to a project module`}
        onClose={() => setCopyOpen(false)}
        footer={
          <>
            <Btn onClick={() => setCopyOpen(false)}>Cancel</Btn>
            <Btn variant="primary" disabled={!targetModuleId} onClick={copyToProject}>
              Copy
            </Btn>
          </>
        }
      >
        <Field label={`Target module (${state.currentProject === "All" ? "all projects" : state.currentProject})`}>
          <select className={inputCls} value={targetModuleId} onChange={(e) => setTargetModuleId(e.target.value)}>
            <option value="">Select a module…</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.proj} › {m.name}
              </option>
            ))}
          </select>
        </Field>
        <p className="mt-3 text-[12px] text-muted-foreground">
          Copies start as “{EXEC_STATUSES[0]}” and can be edited freely inside the project.
        </p>
      </Modal>

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={importLibrary}
        title="Import into the COE library"
        target={
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Step 1 — target core
            </p>
            <select className={inputCls} value={importCore} onChange={(e) => setImportCore(e.target.value as Core)}>
              {CORES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        }
      />
    </div>
  );
}
