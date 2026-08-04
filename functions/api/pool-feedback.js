/* Pool Hub feedback — Cloudflare Pages Function.
   POST /api/pool-feedback

   Emails suggestions to david.james@jamesnetworks.net via Resend
   (same RESEND_API_KEY as NetNudge / Golden Bench).

   Optional env:
     RESEND_API_KEY
     POOL_FEEDBACK_TO   (default david.james@jamesnetworks.net)
     POOL_FEEDBACK_FROM (default Pool Hub <noreply@jamesnetworks.net>)
     NETNUDGE_DB        — if bound, also store a lead row as backup
*/

const NOTIFY_DEFAULT = "david.james@jamesnetworks.net";
const FROM_DEFAULT = "Pool Hub <noreply@jamesnetworks.net>";
const MAX = {
  name: 80,
  email: 120,
  app: 40,
  message: 4000,
};

const APP_LABELS = {
  hub: "Pool Hub",
  captain: "APA Captain",
  nine: "9-Ball Scorer",
  eight: "8-Ball Scorer",
  all: "All / general",
};

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "We couldn't read that submission." }, 400);
  }

  // Honeypot
  if (body.website_url) {
    return json({ ok: true, message: "Thanks — feedback received." });
  }

  const fb = {
    name: clean(body.name, MAX.name),
    email: clean(body.email, MAX.email),
    app: clean(body.app, MAX.app) || "all",
    message: clean(body.message, MAX.message),
  };

  if (!fb.message || fb.message.length < 5) {
    return json({ error: "Tell us a bit more — a few words at least." }, 400);
  }
  if (fb.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fb.email)) {
    return json({ error: "That email address doesn't look right." }, 400);
  }
  if (!APP_LABELS[fb.app]) fb.app = "all";

  fb.receivedAt = new Date().toISOString();
  fb.ip = request.headers.get("cf-connecting-ip") || "";
  fb.city = request.cf?.city || "";
  fb.region = request.cf?.region || "";
  fb.country = request.cf?.country || "";
  fb.host = request.headers.get("host") || "";

  const appLabel = APP_LABELS[fb.app];
  let emailed = false;
  let stored = false;

  if (env.RESEND_API_KEY) {
    try {
      await sendEmail(env, {
        to: env.POOL_FEEDBACK_TO || NOTIFY_DEFAULT,
        subject: `Pool Hub feedback — ${appLabel}${fb.name ? " · " + fb.name : ""}`,
        text: [
          "POOL HUB FEEDBACK",
          "",
          `App: ${appLabel}`,
          `Name: ${fb.name || "(not given)"}`,
          `Email: ${fb.email || "(not given)"}`,
          `Host: ${fb.host}`,
          `When: ${fb.receivedAt}`,
          fb.city ? `Where: ${fb.city}, ${fb.region} ${fb.country}` : "",
          "",
          "Message:",
          fb.message,
        ]
          .filter((line) => line !== "")
          .join("\n"),
        replyTo: fb.email || undefined,
      });
      emailed = true;
    } catch (e) {
      console.error("pool-feedback: email failed", e?.message || e);
    }
  }

  // Best-effort D1 backup in the shared leads table (source = pool-feedback)
  if (env.NETNUDGE_DB) {
    try {
      const slug = "pool-fb-" + Date.now().toString(36);
      await env.NETNUDGE_DB.prepare(
        `INSERT INTO leads
          (slug, business, contact_name, phone, email, does, has_site, site_url,
           want, questions, source, ip, city, region, country, status, received_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      )
        .bind(
          slug,
          `Pool Hub · ${appLabel}`,
          fb.name || "Anonymous",
          "",
          fb.email || "",
          appLabel,
          "n/a",
          "",
          fb.message,
          "[]",
          "pool-feedback",
          fb.ip,
          fb.city,
          fb.region,
          fb.country,
          "new",
          fb.receivedAt
        )
        .run();
      stored = true;
    } catch (e) {
      console.error("pool-feedback: D1 insert failed", e?.message || e);
    }
  }

  if (!emailed && !stored) {
    return json(
      {
        error:
          "Couldn't deliver feedback right now. Email david.james@jamesnetworks.net directly.",
        mailto: "david.james@jamesnetworks.net",
      },
      503
    );
  }

  return json({
    ok: true,
    message: "Thanks — David got your note.",
    emailed,
    stored,
  });
}

function clean(v, max) {
  return String(v == null ? "" : v)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

async function sendEmail(env, { to, subject, text, replyTo }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: env.POOL_FEEDBACK_FROM || env.NETNUDGE_FROM || FROM_DEFAULT,
      to: [to],
      subject,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
  return res.json();
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}
