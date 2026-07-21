/* FlowScout AI enhancement endpoint (Cloudflare Pages Functions).
   Optional: the frontend works fully without it. When deployed with an
   ANTHROPIC_API_KEY environment variable, set on the page:
     window.FLOWSCOUT_API = "/api/flowscout";
   and the blueprint gains a model-written consultant's note grounded in
   the interview transcript. */

const SYSTEM = `You are a senior automation consultant at James Networks, a
"Do It With You" AI partnership firm for small and medium businesses in
Missouri. You are given one prospect's workflow-intake interview. Write a
short "consultant's note" (120-180 words, plain-spoken, no hype, no
bullet points) that: (1) reflects back the most important thing you noticed
about their specific process, (2) endorses or gently caveats the recommended
platform, and (3) names the single smartest first step. Be honest about
anything that should stay manual. Never invent platform facts.`;

export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: "not configured" }, 501);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad request" }, 400);
  }
  const { seed = {}, answers = {}, recommended = "" } = body || {};
  if (!seed.desc || typeof seed.desc !== "string") {
    return json({ error: "bad request" }, 400);
  }

  const transcript = [
    `Industry: ${seed.industry || "unknown"}; company size: ${seed.size || "unknown"}`,
    `Process description: ${String(seed.desc).slice(0, 2000)}`,
    ...Object.entries(answers)
      .filter(([k]) => !k.startsWith("_"))
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`),
    `Recommended platform: ${recommended}`,
  ].join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: SYSTEM,
      messages: [{ role: "user", content: transcript }],
    }),
  });
  if (!res.ok) return json({ error: "upstream error" }, 502);

  const data = await res.json();
  const note = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join(" ")
    .trim();
  return json({ note });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}
