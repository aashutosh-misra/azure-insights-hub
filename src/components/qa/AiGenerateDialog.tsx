import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Badge, Btn, Empty, Field, inputCls, Modal } from "@/components/qa/ui";
import { generateTestCases } from "@/lib/qa/ai.functions";
import type { GeneratedCase } from "@/lib/qa/ai.server";

export function AiGenerateDialog({
  open,
  onClose,
  onAdd,
  moduleName,
  projectName,
  core,
  disabled,
  disabledHint,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (cases: GeneratedCase[]) => void;
  moduleName: string;
  projectName: string;
  core: string;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cases, setCases] = useState<GeneratedCase[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());

  function close() {
    setCases([]);
    setPicked(new Set());
    setError("");
    onClose();
  }

  async function run() {
    setLoading(true);
    setError("");
    try {
      const res = await generateTestCases({ data: { prompt, count, moduleName, projectName, core } });
      if (!res.ok) setError(res.error);
      else {
        setCases(res.cases);
        setPicked(new Set(res.cases.map((_, i) => i)));
      }
    } catch {
      setError("Could not reach the AI service.");
    }
    setLoading(false);
  }

  function toggle(i: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <Modal
      open={open}
      title={
        <span className="flex items-center gap-2">
          <Sparkles className="size-4 text-brand" /> Generate test cases with AI
        </span>
      }
      onClose={close}
      wide
      footer={
        <>
          <Btn onClick={close}>Cancel</Btn>
          <Btn
            variant="primary"
            disabled={picked.size === 0 || disabled}
            onClick={() => {
              onAdd(cases.filter((_, i) => picked.has(i)));
              close();
            }}
          >
            Add {picked.size || ""} selected to set
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        {disabled && disabledHint && (
          <p className="rounded-lg bg-rag-amber-bg px-3 py-2 text-[11.5px] font-semibold text-rag-amber">{disabledHint}</p>
        )}
        <div className="grid gap-3 md:grid-cols-[1fr_120px]">
          <Field label="What should be covered?">
            <textarea
              className={`${inputCls} min-h-[70px]`}
              placeholder="e.g. Member share draft account opening, including joint owners and IRS backup withholding"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </Field>
          <Field label="How many">
            <input
              type="number"
              min={1}
              max={20}
              className={inputCls}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            />
          </Field>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="primary" disabled={!prompt.trim() || loading} onClick={run}>
            {loading ? "Generating…" : cases.length ? "Regenerate" : "Generate"}
          </Btn>
          <span className="text-[11.5px] text-muted-foreground">
            Target: {projectName} › {moduleName || "no module selected"}
          </span>
        </div>
        {error && <p className="text-[11.5px] font-semibold text-rag-red">{error}</p>}

        {cases.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Pick the cases to add ({picked.size}/{cases.length})
              </p>
              <div className="flex gap-1.5">
                <Btn onClick={() => setPicked(new Set(cases.map((_, i) => i)))}>Select all</Btn>
                <Btn onClick={() => setPicked(new Set())}>Clear</Btn>
              </div>
            </div>
            <ul className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
              {cases.map((c, i) => (
                <li
                  key={i}
                  className={`rounded-lg border p-2.5 transition ${picked.has(i) ? "border-brand bg-accent/40" : "border-border"}`}
                >
                  <label className="flex cursor-pointer gap-2">
                    <input type="checkbox" className="mt-1" checked={picked.has(i)} onChange={() => toggle(i)} />
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold text-foreground">{c.title}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Badge tone="blue">{c.type}</Badge>
                        <Badge>{c.priority}</Badge>
                        {c.tags && <Badge tone="muted">{c.tags}</Badge>}
                      </div>
                      {c.desc && <p className="mt-1 text-[11.5px] text-muted-foreground">{c.desc}</p>}
                      {c.steps && (
                        <p className="mt-1 whitespace-pre-wrap text-[11px] text-muted-foreground">{c.steps}</p>
                      )}
                      {c.expected && (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          <span className="font-semibold">Expected:</span> {c.expected}
                        </p>
                      )}
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!cases.length && !loading && <Empty text="Describe the scope, then generate and choose the cases you want." />}
      </div>
    </Modal>
  );
}
