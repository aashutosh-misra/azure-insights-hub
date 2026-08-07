import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProjectItems } from "@/lib/azure.functions";
import type { Metric } from "@/lib/azure.server";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface Drill {
  project: string;
  metric: Metric;
  label: string;
}

export function WorkItemsDialog({
  drill,
  onClose,
}: {
  drill: Drill | null;
  onClose: () => void;
}) {
  const fetchItems = useServerFn(getProjectItems);
  const { data, isFetching } = useQuery({
    queryKey: ["azure-items", drill?.project, drill?.metric],
    queryFn: () => fetchItems({ data: { project: drill!.project, metric: drill!.metric } }),
    enabled: !!drill,
    refetchOnWindowFocus: false,
  });

  const items = data?.ok ? data.items : [];

  return (
    <Dialog open={!!drill} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-5xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="text-base">
            {drill?.label} — {drill?.project}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isFetching
              ? "Loading work items from Azure Boards…"
              : data && !data.ok
                ? data.error
                : `${items.length} work item${items.length === 1 ? "" : "s"} · click an ID to open in Azure DevOps`}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                {["ID", "Type", "Title", "State", "Assigned to", "Due", "Inactive"].map((h) => (
                  <th key={h} className="px-4 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-b border-border align-top">
                  <td className="px-4 py-2">
                    <a
                      href={i.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-rag-blue underline-offset-2 hover:underline"
                    >
                      {i.id}
                    </a>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{i.type}</td>
                  <td className="max-w-[380px] px-4 py-2">
                    <span className="block truncate text-foreground" title={i.title}>
                      {i.title}
                    </span>
                    {i.tags && <span className="text-[11px] text-muted-foreground">{i.tags}</span>}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{i.state}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{i.assignedTo}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {i.dueDate ? new Date(i.dueDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{i.daysInactive}d</td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {isFetching ? "Loading…" : "No matching work items."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
