import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Btn, Card, Field, inputCls } from "@/components/qa/ui";

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s["next"] === "string" ? (s["next"] as string) : "",
  }),
  head: () => ({
    meta: [
      { title: "Sign in | Azure Insights Hub" },
      { name: "description", content: "Sign in to Azure Insights Hub to access QA delivery and Azure DevOps project insights." },
      { property: "og:title", content: "Sign in to Azure Insights Hub" },
      { property: "og:description", content: "Access QA delivery and Azure DevOps project insights." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function safeNext(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

function LoginPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const target = safeNext(next);

  async function submit() {
    setBusy(true);
    setMsg(null);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}${target}` },
      });
      setBusy(false);
      setMsg(error ? error.message : "Check your inbox to confirm your address, then sign in.");
      if (!error) setMode("signin");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    window.location.href = target;
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <Card title={mode === "signin" ? "Sign in" : "Create account"}>
        <div className="space-y-3">
          <Field label="Email">
            <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password">
            <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {msg && (
            <p role="alert" className="text-[12px] text-rag-red">
              {msg}
            </p>
          )}
          <div className="flex items-center justify-between">
            <Btn variant="ghost" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
              {mode === "signin" ? "Need an account?" : "Have an account?"}
            </Btn>
            <div className="flex gap-2">
              <Btn variant="ghost" onClick={() => navigate({ to: "/" })}>
                Cancel
              </Btn>
              <Btn variant="primary" disabled={busy || !email || !password} onClick={submit}>
                {mode === "signin" ? "Sign in" : "Sign up"}
              </Btn>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
