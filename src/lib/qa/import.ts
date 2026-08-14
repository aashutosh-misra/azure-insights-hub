import * as XLSX from "xlsx";

/** Canonical test case fields an imported sheet can map onto. */
export const IMPORT_FIELDS = [
  { key: "title", label: "Title", required: true },
  { key: "desc", label: "Description" },
  { key: "steps", label: "Steps" },
  { key: "expected", label: "Expected result" },
  { key: "type", label: "Type" },
  { key: "priority", label: "Priority" },
  { key: "assignee", label: "Assignee" },
  { key: "status", label: "Status" },
  { key: "automation", label: "Automation" },
  { key: "tags", label: "Tags" },
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number]["key"];

/** Synonyms used by the automatic header mapper. */
const SYNONYMS: Record<ImportField, string[]> = {
  title: ["title", "testcase", "testcasetitle", "tctitle", "tcname", "name", "scenario", "testscenario", "summary", "testcasename", "case"],
  desc: ["description", "desc", "objective", "purpose", "details", "testobjective", "precondition", "preconditions"],
  steps: ["steps", "teststeps", "stepstoreproduce", "stepstoexecute", "procedure", "action", "actions", "testprocedure", "execution"],
  expected: ["expected", "expectedresult", "expectedresults", "expectedoutput", "expectedbehaviour", "expectedbehavior", "acceptancecriteria", "result"],
  type: ["type", "testtype", "category", "testcategory", "kind"],
  priority: ["priority", "severity", "sev", "prio", "importance", "criticality"],
  assignee: ["assignee", "assignedto", "owner", "tester", "executedby", "responsible"],
  status: ["status", "executionstatus", "teststatus", "result status", "state", "outcome"],
  automation: ["automation", "automated", "automationstatus", "manualautomated", "execmode", "mode"],
  tags: ["tags", "labels", "keywords", "tag", "module area", "component"],
};

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function score(header: string, candidate: string) {
  const h = norm(header);
  const c = norm(candidate);
  if (!h || !c) return 0;
  if (h === c) return 100;
  if (h.startsWith(c) || c.startsWith(h)) return 80;
  if (h.includes(c) || c.includes(h)) return 65;
  // token overlap
  const ht = new Set(h.match(/[a-z]+|\d+/g) ?? []);
  const ct = new Set(c.match(/[a-z]+|\d+/g) ?? []);
  const shared = [...ct].filter((t) => ht.has(t)).length;
  return shared ? 30 + shared * 5 : 0;
}

/** Best-effort automatic mapping of raw sheet headers to canonical fields. */
export function autoMap(headers: string[]): Record<string, ImportField | ""> {
  const used = new Set<ImportField>();
  const map: Record<string, ImportField | ""> = {};
  const scored: { header: string; field: ImportField; s: number }[] = [];

  for (const header of headers) {
    for (const f of IMPORT_FIELDS) {
      const best = Math.max(...SYNONYMS[f.key].map((syn) => score(header, syn)));
      if (best >= 45) scored.push({ header, field: f.key, s: best });
    }
    map[header] = "";
  }
  scored.sort((a, b) => b.s - a.s);
  for (const row of scored) {
    if (used.has(row.field) || map[row.header]) continue;
    map[row.header] = row.field;
    used.add(row.field);
  }
  return map;
}

export interface ParsedSheet {
  headers: string[];
  rows: Record<string, string>[];
}

function parseCsv(text: string): ParsedSheet {
  const wb = XLSX.read(text, { type: "string" });
  return sheetToParsed(wb);
}

function sheetToParsed(wb: XLSX.WorkBook): ParsedSheet {
  const first = wb.SheetNames[0];
  if (!first) return { headers: [], rows: [] };
  const ws = wb.Sheets[first]!;
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });
  const headers = raw.length ? Object.keys(raw[0]!) : [];
  const rows = raw.map((r) => {
    const out: Record<string, string> = {};
    for (const h of headers) out[h] = String(r[h] ?? "").trim();
    return out;
  });
  return { headers, rows: rows.filter((r) => Object.values(r).some(Boolean)) };
}

export async function parseFile(file: File): Promise<ParsedSheet> {
  if (/\.csv$/i.test(file.name)) return parseCsv(await file.text());
  const buf = await file.arrayBuffer();
  return sheetToParsed(XLSX.read(buf, { type: "array" }));
}

export const TEMPLATE_HEADERS = IMPORT_FIELDS.map((f) => f.label);

export function downloadTemplate() {
  const rows = [
    TEMPLATE_HEADERS,
    [
      "Verify member login with valid credentials",
      "Member is able to authenticate",
      "1. Open login\n2. Enter credentials\n3. Submit",
      "Member lands on the dashboard",
      "Functional",
      "High",
      "",
      "Not Executed",
      "Manual",
      "login,smoke",
    ],
  ];
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "test-case-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}
