/* Stories from the Shop — comments.
   GET  /api/msp-stories-comment  — public list
   POST /api/msp-stories-comment  — submit (emails David, stores if D1/KV bound)

   Reuses RESEND_API_KEY (same as Pool Hub / NetNudge).
   Optional: NETNUDGE_DB (D1), MSP_COMMENTS (KV)
   Optional env: STORIES_NOTIFY_TO, STORIES_NOTIFY_FROM
*/

const NOTIFY_DEFAULT = "david.james@jamesnetworks.net";
const FROM_DEFAULT = "Stories from the Shop <noreply@jamesnetworks.net>";
const MAX = { name: 80, email: 120, body: 2000 };
const LIST_LIMIT = 50;

export async function onRequest({ request, env }) {
  if (request.method === "GET") return onGet(env);
  if (request.method === "POST") return onPost(request, env);
  return json({ error: "Method not allowed." }, 405);
}

async function onGet(env) {
  const comments = await listComments(env);
  return json({ comments });
}

async function onPost(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "We couldn't read that comment." }, 400);
  }

  if (body.website_url) {
    return json({ ok: true, message: "Thanks — David got your note." });
  }

  const comment = {
    id: crypto.randomUUID(),
    name: clean(body.name, MAX.name),
    email: clean(body.email, MAX.email),
    body: clean(body.body, MAX.body),
    receivedAt: new Date().toISOString(),
  };

  if (!comment.name || comment.name.length < 2) {
    return json({ error: "Leave a name so David knows who wrote it." }, 400);
  }
  if (!comment.body || comment.body.length < 5) {
    return json({ error: "Say a bit more — a few words at least." }, 400);
  }
  if (comment.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(comment.email)) {
    return json({ error: "That email address doesn't look right." }, 400);
  }

  const meta = {
    ip: request.headers.get("cf-connecting-ip") || "",
    city: request.cf?.city || "",
    region: request.cf?.region || "",
    country: request.cf?.country || "",
    host: request.headers.get("host") || "",
  };

  let emailed = false;
  let stored = false;

  if (env.RESEND_API_KEY) {
    try {
      await sendEmail(env, {
        to: env.STORIES_NOTIFY_TO || env.POOL_FEEDBACK_TO || NOTIFY_DEFAULT,
        subject: `Stories from the Shop — comment from ${comment.name}`,
        text: [
          "STORIES FROM THE SHOP — NEW COMMENT",
          "",
          `Name: ${comment.name}`,
          `Email: ${comment.email || "(not given)"}`,
          `Host: ${meta.host}`,
          `When: ${comment.receivedAt}`,
          meta.city ? `Where: ${meta.city}, ${meta.region} ${meta.country}` : "",
          "",
          "Comment:",
          comment.body,
        ]
          .filter((line) => line !== "")
          .join("\n"),
        replyTo: comment.email || undefined,
      });
      emailed = true;
    } catch (e) {
      console.error("msp-stories-comment: email failed", e?.message || e);
    }
  }

  try {
    stored = await saveComment(env, comment);
  } catch (e) {
    console.error("msp-stories-comment: store failed", e?.message || e);
  }

  if (!emailed && !stored) {
    return json(
      {
        error:
          "Couldn't deliver that right now. Email david.james@jamesnetworks.net directly.",
        mailto: "david.james@jamesnetworks.net",
      },
      503
    );
  }

  return json({
    ok: true,
    message: "Thanks — David got your note.",
    comment: publicComment(comment),
    emailed,
    stored,
  });
}

function publicComment(c) {
  return {
    id: c.id,
    name: c.name,
    body: c.body,
    receivedAt: c.receivedAt,
  };
}

async function listComments(env) {
  if (env.MSP_COMMENTS) {
    const raw = await env.MSP_COMMENTS.get("comments", "json");
    const list = Array.isArray(raw) ? raw : [];
    return list.slice(-LIST_LIMIT).reverse().map(publicComment);
  }
  if (env.NETNUDGE_DB) {
    await ensureTable(env.NETNUDGE_DB);
    const { results } = await env.NETNUDGE_DB.prepare(
      `SELECT id, name, body, received_at AS receivedAt
       FROM msp_story_comments
       ORDER BY received_at DESC
       LIMIT ?`
    )
      .bind(LIST_LIMIT)
      .all();
    return results || [];
  }
  return [];
}

async function saveComment(env, comment) {
  if (env.MSP_COMMENTS) {
    const raw = (await env.MSP_COMMENTS.get("comments", "json")) || [];
    const list = Array.isArray(raw) ? raw : [];
    list.push(comment);
    await env.MSP_COMMENTS.put("comments", JSON.stringify(list.slice(-200)));
    return true;
  }
  if (env.NETNUDGE_DB) {
    await ensureTable(env.NETNUDGE_DB);
    await env.NETNUDGE_DB.prepare(
      `INSERT INTO msp_story_comments (id, name, email, body, received_at)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(comment.id, comment.name, comment.email, comment.body, comment.receivedAt)
      .run();
    return true;
  }
  return false;
}

async function ensureTable(db) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS msp_story_comments (
         id TEXT PRIMARY KEY,
         name TEXT NOT NULL,
         email TEXT,
         body TEXT NOT NULL,
         received_at TEXT NOT NULL
       )`
    )
    .run();
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
      from: env.STORIES_NOTIFY_FROM || env.POOL_FEEDBACK_FROM || env.NETNUDGE_FROM || FROM_DEFAULT,
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
