import { useState, type ReactNode } from "react";
import { Download, FileSpreadsheet, Wand2 } from "lucide-react";
import { Btn, Empty, Field, inputCls, Modal, Table, Td } from "@/components/qa/ui";
import { autoMap, downloadTemplate, IMPORT_FIELDS, parseFile, type ImportField, type ParsedSheet } from "@/lib/qa/import";

export function ImportDialog({
  open,
  onClose,
  onImport,
  target,
  canImport = true,
  title = "Import test cases",
}: {
  open: boolean;
  onClose: () => void;
  onImport: (records: Record<ImportField, string>[]) => void;
  /** target project/module pickers rendered above the file step */
  target?: ReactNode;
  canImport?: boolean;
  title?: string;
}) {
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [map, setMap] = useState<Record<string, ImportField | "">>({});
  const [error, setError] = useState("");

  async function pick(file: File) {
    setError("");
    try {
      const parsed = await parseFile(file);
      if (!parsed.headers.length) {
        setError("No readable rows were found in that file.");
        return;
      }
      setSheet(parsed);
      setMap(autoMap(parsed.headers));
    } catch {
      setError("Could not read that file. Use .csv or .xlsx.");
    }
  }

  function run() {
    if (!sheet) return;
    const records = sheet.rows.map((row) => {
      const rec = {} as Record<ImportField, string>;
      for (const [header, field] of Object.entries(map)) {
        if (field) rec[field] = row[header] ?? "";
      }
      return rec;
    });
    onImport(records.filter((r) => (r.title ?? "").trim()));
    setSheet(null);
    setMap({});
    onClose();
  }

  const mappedCount = Object.values(map).filter(Boolean).length;

  return (
    <Modal
      open={open}
      wide
      title={title}
      onClose={() => {
        setSheet(null);
        onClose();
      }}
      footer={
        <>
          <Btn variant="ghost" onClick={downloadTemplate}>
            <Download className="size-3.5" /> Download template
          </Btn>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={run} disabled={!sheet || !canImport}>
            Import {sheet ? `${sheet.rows.length} row(s)` : ""}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        {target}

        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Step 2 — choose a .csv or .xlsx file
          </p>
          <label className="surface-3d lift-3d flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed border-primary/40 bg-accent/40 px-4 py-6 text-center">
            <FileSpreadsheet className="size-6 text-primary" />
            <span className="text-[12.5px] font-semibold">
              {sheet ? `${sheet.rows.length} rows · ${sheet.headers.length} columns detected` : "Click to select a file"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              Predefined template or a raw export — headers are matched automatically.
            </span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])}
            />
          </label>
          {error && <p className="mt-2 text-[12px] font-semibold text-rag-red">{error}</p>}
        </div>

        {sheet && (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Wand2 className="size-3.5 text-primary" /> Step 3 — header mapping ({mappedCount} of {sheet.headers.length} matched)
            </p>
            <Table head={["File column", "Sample value", "Maps to"]} minWidth={560}>
              {sheet.headers.map((h) => (
                <tr key={h} className="border-b border-border last:border-0">
                  <Td className="font-semibold">{h}</Td>
                  <Td className="max-w-[220px] truncate text-muted-foreground">{sheet.rows[0]?.[h] || "—"}</Td>
                  <Td>
                    <select
                      className={inputCls}
                      value={map[h] ?? ""}
                      onChange={(e) => setMap({ ...map, [h]: e.target.value as ImportField | "" })}
                    >
                      <option value="">— ignore —</option>
                      {IMPORT_FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </Td>
                </tr>
              ))}
            </Table>
            {!Object.values(map).includes("title") && (
              <p className="mt-2 text-[12px] font-semibold text-rag-amber">Map one column to “Title” before importing.</p>
            )}
          </div>
        )}

        {!sheet && !error && <Empty text="Nothing loaded yet." />}
      </div>
    </Modal>
  );
}

export { Field };
