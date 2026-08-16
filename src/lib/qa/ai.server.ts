export interface GeneratedCase {
  title: string;
  type: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  desc: string;
  steps: string;
  expected: string;
  tags: string;
}

const SYSTEM = `You are a senior QA lead for core banking / credit union platforms.
Generate concrete, executable manual test cases.
Return ONLY JSON of the shape {"cases":[{"title","type","priority","desc","steps","expected","tags"}]}.
"type" is one of Functional, Integration, Regression, Performance, Security, UAT.
"priority" is one of Critical, High, Medium, Low.
"steps" is a numbered list separated by newlines. Keep each case independent and specific.`;

export async function generateCases(input: {
  prompt: string;
  count: number;
  moduleName: string;
  projectName: string;
  core: string;
}): Promise<GeneratedCase[]> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured for this app.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Project: ${input.projectName} (core: ${input.core})
Module / scope: ${input.moduleName}
Generate ${input.count} test cases for: ${input.prompt}`,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("Rate limit reached, please retry in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted for this workspace.");
  if (!res.ok) throw new Error(`AI request failed (${res.status})`);

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  let parsed: { cases?: GeneratedCase[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI returned an unreadable response.");
  }
  const cases = Array.isArray(parsed.cases) ? parsed.cases : [];
  return cases
    .filter((c) => c && typeof c.title === "string" && c.title.trim())
    .slice(0, 25)
    .map((c) => ({
      title: String(c.title).trim(),
      type: c.type || "Functional",
      priority: (["Critical", "High", "Medium", "Low"] as const).includes(c.priority) ? c.priority : "Medium",
      desc: c.desc ?? "",
      steps: c.steps ?? "",
      expected: c.expected ?? "",
      tags: c.tags ?? "",
    }));
}
