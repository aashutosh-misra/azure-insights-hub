import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Btn, Card } from "@/components/qa/ui";

interface OAuthResult {
  data?: {
    client?: { name?: string; redirect_uri?: string } | null;
    scope?: string;
    redirect_url?: string;
    redirect_to?: string;
  } | null;
  error?: { message: string } | null;
}

interface OAuthApi {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
}

const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? (s["authorization_id"] as string) : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/login", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md py-10">
      <Card title="Authorization error">
        <p className="text-[12.5px] text-muted-foreground">
          Could not load this authorization request: {String((error as Error)?.message ?? error)}
        </p>
      </Card>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "an app";

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error: err } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="mx-auto max-w-md py-10">
      <Card title="Connect an app">
        <h1 className="text-base font-bold text-foreground">Connect {clientName} to Azure Insights Hub</h1>
        <p className="mt-2 text-[12.5px] text-muted-foreground">
          {clientName} will be able to call this app's enabled tools while you are signed in — reading Azure DevOps
          project health and work items as you.
        </p>
        {details?.client?.redirect_uri && (
          <p className="mt-2 break-all text-[11.5px] text-muted-foreground">Redirects to {details.client.redirect_uri}</p>
        )}
        <p className="mt-2 text-[11.5px] text-muted-foreground">
          This does not bypass this app's permissions or backend policies.
        </p>
        {error && (
          <p role="alert" className="mt-3 text-[12px] text-rag-red">
            {error}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Btn variant="ghost" disabled={busy} onClick={() => decide(false)}>
            Cancel connection
          </Btn>
          <Btn variant="primary" disabled={busy} onClick={() => decide(true)}>
            Approve
          </Btn>
        </div>
      </Card>
    </main>
  );
}
