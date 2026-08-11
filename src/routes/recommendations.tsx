import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Badge, Card, Empty, PageHeader } from "@/components/qa/ui";
import { recommendations, STATUS_TONE } from "@/lib/qa/compute";
import { useQa } from "@/lib/qa/store";

export const Route = createFileRoute("/recommendations")({
  head: () => ({
    meta: [
      { title: "Recommendations | QA Delivery Intelligence" },
      { name: "description", content: "Prioritised QA actions derived from execution, defect and coverage signals." },
      { property: "og:title", content: "QA Recommendations" },
      { property: "og:description", content: "Prioritised QA actions derived from live delivery signals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RecommendationsPage,
});

function RecommendationsPage() {
  const { state } = useQa();
  const recs = useMemo(() => recommendations(state), [state]);

  return (
    <div className="space-y-4">
      <PageHeader title="Recommendations" subtitle="Automated insights from execution, defects and coverage" />
      <Card title={`${recs.length} recommendations`}>
        <ul className="space-y-2">
          {recs.map((r) => (
            <li key={r.title} className="flex gap-3 rounded-md border border-border px-3 py-2">
              <Badge tone={STATUS_TONE[r.severity] ?? "muted"}>{r.severity}</Badge>
              <div>
                <p className="text-[12.5px] font-semibold text-foreground">{r.title}</p>
                <p className="text-[11.5px] text-muted-foreground">{r.detail}</p>
              </div>
            </li>
          ))}
          {!recs.length && <Empty text="Nothing flagged right now." />}
        </ul>
      </Card>
    </div>
  );
}
