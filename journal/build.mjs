#!/usr/bin/env node
/**
 * Build the personal journal into static HTML under journal/.
 * Source of truth: journal/content/**.md
 *
 *   node journal/build.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const CONTENT = path.join(ROOT, "content");
const POSTS_DIR = path.join(CONTENT, "posts");
const PAGES_DIR = path.join(CONTENT, "pages");

const SITE = {
  name: "James Networks",
  tagline: "Notes from Clinton, Missouri",
  origin: "https://www.jamesnetworks.net",
  author: "David James",
  email: "david.james@jamesnetworks.net",
  description:
    "David James writes from Clinton, Missouri — IT, AI, the work, pool, fishing, and whatever he's actually doing.",
  umami: "33b9a318-245a-4fe9-9d53-0f30e0b25c1c",
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw.trim() };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (val.startsWith("[") && val.endsWith("]")) {
      val = val
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    }
    meta[key] = val;
  }
  return { meta, body: m[2].trim() };
}

function inlineMarkdown(text) {
  const parts = [];
  let i = 0;
  const src = text;
  while (i < src.length) {
    if (src[i] === "`") {
      const end = src.indexOf("`", i + 1);
      if (end !== -1) {
        parts.push(`<code>${escapeHtml(src.slice(i + 1, end))}</code>`);
        i = end + 1;
        continue;
      }
    }
    if (src.startsWith("**", i)) {
      const end = src.indexOf("**", i + 2);
      if (end !== -1) {
        parts.push(`<strong>${inlineMarkdown(src.slice(i + 2, end))}</strong>`);
        i = end + 2;
        continue;
      }
    }
    if (src[i] === "*" && src[i + 1] !== " ") {
      const end = src.indexOf("*", i + 1);
      if (end !== -1) {
        parts.push(`<em>${inlineMarkdown(src.slice(i + 1, end))}</em>`);
        i = end + 1;
        continue;
      }
    }
    if (src[i] === "[") {
      const close = src.indexOf("]", i);
      const hrefStart = close !== -1 && src[close + 1] === "(" ? close + 2 : -1;
      const hrefEnd = hrefStart !== -1 ? src.indexOf(")", hrefStart) : -1;
      if (close !== -1 && hrefStart !== -1 && hrefEnd !== -1) {
        const label = inlineMarkdown(src.slice(i + 1, close));
        const href = escapeHtml(src.slice(hrefStart, hrefEnd));
        const ext = /^https?:\/\//.test(src.slice(hrefStart, hrefEnd));
        const rel = ext ? ' target="_blank" rel="noopener noreferrer"' : "";
        parts.push(`<a href="${href}"${rel}>${label}</a>`);
        i = hrefEnd + 1;
        continue;
      }
    }
    let j = i + 1;
    while (j < src.length && !"`*[".includes(src[j]) && !src.startsWith("**", j)) j++;
    parts.push(escapeHtml(src.slice(i, j)));
    i = j;
  }
  return parts.join("");
}

function markdownToHtml(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;
  let para = [];

  const flushPara = () => {
    if (!para.length) return;
    const text = para.join(" ").trim();
    if (text) out.push(`<p>${inlineMarkdown(text)}</p>`);
    para = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      flushPara();
      const lang = escapeHtml(line.slice(3).trim());
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      out.push(
        `<pre><code${lang ? ` class="language-${lang}"` : ""}>${escapeHtml(buf.join("\n"))}</code></pre>`
      );
      i++;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      flushPara();
      out.push("<hr />");
      i++;
      continue;
    }

    const heading = line.match(/^(#{2,3})\s+(.+)$/);
    if (heading) {
      flushPara();
      const level = heading[1].length;
      const id = heading[2]
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      out.push(`<h${level} id="${id}">${inlineMarkdown(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    if (line.startsWith("> ")) {
      flushPara();
      const buf = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        buf.push(lines[i].slice(2));
        i++;
      }
      out.push(`<blockquote>${markdownToHtml(buf.join("\n"))}</blockquote>`);
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      flushPara();
      out.push("<ul>");
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        out.push(`<li>${inlineMarkdown(lines[i].replace(/^\s*[-*]\s+/, ""))}</li>`);
        i++;
      }
      out.push("</ul>");
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      flushPara();
      out.push("<ol>");
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        out.push(`<li>${inlineMarkdown(lines[i].replace(/^\s*\d+\.\s+/, ""))}</li>`);
        i++;
      }
      out.push("</ol>");
      continue;
    }

    if (!line.trim()) {
      flushPara();
      i++;
      continue;
    }

    para.push(line.trim());
    i++;
  }
  flushPara();
  return out.join("\n");
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function slugFromFilename(file) {
  return path.basename(file, ".md").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

function listPostFiles(dir, prefix = "") {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (name === "msp") out.push(...listPostFiles(full, "msp"));
      continue;
    }
    if (!name.endsWith(".md") || name.toLowerCase() === "readme.md") continue;
    out.push({ file: full, rel, fromMspDir: prefix === "msp" });
  }
  return out;
}

function loadPosts() {
  return listPostFiles(POSTS_DIR)
    .map(({ file, rel, fromMspDir }) => {
      const { meta, body } = parseFrontmatter(read(file));
      if (meta.draft === "true" || meta.draft === true) return null;
      const slug = meta.slug || slugFromFilename(path.basename(file));
      if (!meta.build || !meta.build_url) {
        throw new Error(
          `${rel} is missing build / build_url. Weekly posts always highlight a hosted build.`
        );
      }
      const sectionRaw = (meta.section || (fromMspDir ? "msp" : "personal"))
        .toString()
        .toLowerCase();
      const section = sectionRaw === "msp" ? "msp" : "personal";
      return {
        slug,
        title: meta.title || slug,
        date: meta.date || "1970-01-01",
        summary: meta.summary || "",
        build: meta.build,
        build_url: meta.build_url,
        build_note: meta.build_note || "",
        section,
        body,
        html: markdownToHtml(body),
        path: `/writing/${slug}/`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function loadPage(name) {
  const file = path.join(PAGES_DIR, `${name}.md`);
  const { meta, body } = parseFrontmatter(read(file));
  return {
    name,
    title: meta.title || name,
    description: meta.description || SITE.description,
    updated: meta.updated || "",
    html: markdownToHtml(body),
    path: `/${name}/`,
  };
}

function loadBuilt() {
  return JSON.parse(read(path.join(CONTENT, "built.json")));
}

function isExternalHref(href) {
  return /^https?:\/\//.test(href);
}

function matchBuiltItem(post) {
  const built = loadBuilt();
  const all = [
    ...(built.personal || []),
    ...(built.msp || []),
    ...(built.network || []),
    ...(built.apps || []),
  ];
  return (
    all.find((item) => item.href === post.build_url || item.title === post.build) ||
    null
  );
}

function renderWeekBuild(post) {
  const rel = /^https?:\/\//.test(post.build_url)
    ? ' target="_blank" rel="noopener noreferrer"'
    : "";
  const known = matchBuiltItem(post);
  const note = post.build_note || (known && known.blurb) || "";
  const thumb = known
    ? `<div class="app-thumb"><img src="${escapeHtml(known.image)}" width="640" height="360" alt="${escapeHtml(known.alt || post.build)}" /></div>`
    : "";
  return `<aside class="week-build">
      <p class="eyebrow">This week's build</p>
      ${thumb}
      <h2>${escapeHtml(post.build)}</h2>
      ${note ? `<p>${escapeHtml(note)}</p>` : ""}
      <a class="btn btn-primary" href="${escapeHtml(post.build_url)}"${rel}>See it live</a>
    </aside>`;
}

function renderPostBuildLine(post) {
  const msp =
    post.section === "msp" ? `<span class="post-section">MSP</span>` : "";
  return `${msp}<span class="post-build">Build · ${escapeHtml(post.build)}</span>`;
}

function renderCards(items, extraClass = "") {
  const cards = items
    .map((item) => {
      const rel = isExternalHref(item.href)
        ? ' target="_blank" rel="noopener noreferrer"'
        : "";
      const tags = (item.tags || [])
        .map((t) => `<li>${escapeHtml(t)}</li>`)
        .join("");
      return `<article class="app-card">
        <div class="app-thumb">
          <img src="${escapeHtml(item.image)}" width="640" height="360" alt="${escapeHtml(item.alt || "")}" />
        </div>
        <div class="app-top">
          <span class="app-badge">${escapeHtml(item.badge || "Live")}</span>
          <span class="app-domain">${escapeHtml(item.domain)}</span>
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.blurb)}</p>
        <ul class="app-meta">${tags}</ul>
        <a class="btn btn-primary" href="${escapeHtml(item.href)}"${rel}>Open ${escapeHtml(item.title)}</a>
      </article>`;
    })
    .join("\n        ");
  return `<div class="card-grid ${extraClass}">
        ${cards}
      </div>`;
}

function renderShelf(id, heading, lead, items, gridClass) {
  if (!items || !items.length) return "";
  return `
    <section class="built" id="${id}" aria-labelledby="${id}-heading">
      <header class="section-head">
        <h2 id="${id}-heading">${escapeHtml(heading)}</h2>
        <p class="section-lead">${escapeHtml(lead)}</p>
      </header>
      ${renderCards(items, gridClass)}
    </section>`;
}

function renderBuiltBlock(mode = "home") {
  const built = loadBuilt();
  const personal = built.personal || built.apps || [];
  const msp = built.msp || built.network || [];
  if (mode === "personal") {
    return renderShelf(
      "built",
      "Personal & lab",
      "Placeholder lead — David will rewrite. Personal projects and lab apps.",
      personal,
      "apps"
    );
  }
  if (mode === "msp") {
    return renderShelf(
      "msp-built",
      "MSP highlights",
      "Placeholder lead — David will rewrite. MSP workflows, consulting tools, automations.",
      msp,
      "three"
    );
  }
  return `
    <div class="built-split" id="built">
      ${renderShelf(
        "personal",
        "Personal & lab",
        "Placeholder — personal projects and lab apps. David edits this.",
        personal,
        "apps"
      )}
      ${renderShelf(
        "msp",
        "MSP work",
        "Placeholder — MSP workflows and automations. Full list on /msp/.",
        msp,
        "three"
      )}
      <p class="more built-more"><a href="/work/">All personal &amp; lab</a> · <a href="/msp/">MSP highlights</a> · <a href="/writing/msp/">MSP writing</a></p>
    </div>`;
}

function nav(current) {
  const items = [
    ["/", "Home"],
    ["/work/", "Built"],
    ["/msp/", "MSP"],
    ["/writing/", "Writing"],
    ["/about/", "About"],
    ["/now/", "Now"],
  ];
  return items
    .map(([href, label]) => {
      const active =
        (href === "/" && current === "/") ||
        (href !== "/" && current.startsWith(href));
      const aria = active ? ' aria-current="page"' : "";
      return `<a href="${href}"${aria}>${label}</a>`;
    })
    .join("\n        ");
}

function layout({
  title,
  description,
  path,
  canonical,
  type = "website",
  extraHead = "",
  bodyClass = "",
  content,
}) {
  const fullTitle = path === "/" ? `${SITE.name} — ${SITE.tagline}` : `${title} — ${SITE.name}`;
  const url = `${SITE.origin}${canonical || path}`;
  const og = `${SITE.origin}/assets/hero-steampunk.jpg`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="theme-color" content="#0a0c10" />
  <title>${escapeHtml(fullTitle)}</title>
  <link rel="canonical" href="${url}" />
  <meta name="author" content="${SITE.author}" />
  <link rel="alternate" type="application/rss+xml" title="${SITE.name}" href="${SITE.origin}/rss.xml" />

  <meta property="og:type" content="${type}" />
  <meta property="og:site_name" content="${SITE.name}" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:title" content="${escapeHtml(fullTitle)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${og}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(fullTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${og}" />

  ${extraHead}

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/journal/styles.css" />
  <link rel="icon" href="/assets/badge-j.jpg" type="image/jpeg" />
  <link rel="apple-touch-icon" href="/assets/badge-j.jpg" />
  <script defer src="https://stats.aiformissouri.com/script.js" data-website-id="${SITE.umami}"></script>
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ""}>
  <a class="skip-link" href="#main">Skip to content</a>

  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="/" aria-label="${SITE.name} home">
        <img class="brand-logo" src="/assets/badge-j.jpg" width="44" height="44" alt="James Networks" />
        <span class="brand-text">
          <strong>James Networks</strong>
          <span>David James · notes</span>
        </span>
      </a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Open menu">
        <span></span><span></span><span></span>
      </button>
      <nav class="site-nav" id="site-nav" aria-label="Primary">
        ${nav(path)}
      </nav>
    </div>
  </header>

  <main id="main">
    ${content}
  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <p class="footer-id">James Networks · Clinton, Missouri</p>
      <nav aria-label="Footer">
        <a href="/work/">Built</a>
        <a href="/msp/">MSP</a>
        <a href="/writing/">Writing</a>
        <a href="/about/">About</a>
        <a href="/now/">Now</a>
        <a href="/rss.xml">RSS</a>
        <a href="/privacy/">Privacy</a>
        <a href="mailto:${SITE.email}">Email</a>
      </nav>
      <p class="footer-copy">© <span id="year"></span> James Networks. Written by David James. Consulting lives at <a href="https://www.henrycountyconsulting.com/">Henry County Consulting</a>.</p>
    </div>
  </footer>
  <script src="/journal/script.js"></script>
</body>
</html>
`;
}

function jsonLd(obj) {
  return `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n  </script>`;
}

function personLd() {
  return {
    "@type": "Person",
    "@id": `${SITE.origin}/#david`,
    name: SITE.author,
    url: `${SITE.origin}/about/`,
    email: SITE.email,
    jobTitle: "IT operator, consultant, writer",
    homeLocation: { "@type": "Place", name: "Clinton, Henry County, Missouri" },
    sameAs: [
      "https://www.henrycountyconsulting.com/",
      "https://www.aiformissouri.com/",
      "https://www.djprints3d.com/",
    ],
  };
}

function renderHome(posts) {
  const latest = posts
    .map(
      (p) => `<li>
        <a href="${p.path}">
          <time datetime="${p.date}">${formatDate(p.date)}</time>
          <span class="post-title">${escapeHtml(p.title)}</span>
          ${renderPostBuildLine(p)}
          <span class="post-sum">${escapeHtml(p.summary)}</span>
        </a>
      </li>`
    )
    .join("\n        ");

  const extraHead = jsonLd({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE.origin}/#website`,
        url: `${SITE.origin}/`,
        name: SITE.name,
        description: SITE.description,
        inLanguage: "en-US",
        publisher: { "@id": `${SITE.origin}/#david` },
      },
      {
        "@type": "Blog",
        "@id": `${SITE.origin}/#blog`,
        url: `${SITE.origin}/writing/`,
        name: SITE.name,
        description: SITE.description,
        author: { "@id": `${SITE.origin}/#david` },
      },
      personLd(),
    ],
  });

  const content = `
    <section class="intro">
      <p class="eyebrow">Clinton, Missouri · built in brass &amp; bits</p>
      <p class="lede">I'm David James. Thirty years in IT. This is the notebook — and the shelf of things I've actually shipped.</p>
      <p>Consulting has its own door. Education has its own door. The apps I needed for league night have theirs. Here I write about the work, the learning, pool, fishing, and whatever I'm actually doing.</p>
    </section>
    ${renderBuiltBlock()}
    <section class="post-index" aria-labelledby="latest-heading">
      <h1 id="latest-heading" class="index-heading">Latest</h1>
      <ol class="post-list">
        ${latest}
      </ol>
      <p class="more"><a href="/writing/">All writing</a> · <a href="/writing/msp/">MSP writing</a> · <a href="/rss.xml">RSS</a></p>
    </section>`;

  return layout({
    title: SITE.name,
    description: SITE.description,
    path: "/",
    extraHead,
    bodyClass: "page-home",
    content,
  });
}

function renderArchive(posts, opts = {}) {
  const title = opts.title || "Writing";
  const description =
    opts.description || "All notes from David James — Clinton, Missouri.";
  const pathName = opts.path || "/writing/";
  const deck =
    opts.deck || "Weekly. Each note highlights a hosted build you can open.";
  const extra =
    opts.extraLinks ||
    `<p class="more"><a href="/writing/msp/">MSP writing</a> · <a href="/rss.xml">RSS</a></p>`;
  const items = posts
    .map(
      (p) => `<li>
        <a href="${p.path}">
          <time datetime="${p.date}">${formatDate(p.date)}</time>
          <span class="post-title">${escapeHtml(p.title)}</span>
          ${renderPostBuildLine(p)}
          <span class="post-sum">${escapeHtml(p.summary)}</span>
        </a>
      </li>`
    )
    .join("\n        ");

  return layout({
    title,
    description,
    path: pathName,
    content: `
    <header class="page-head">
      <h1>${escapeHtml(title)}</h1>
      <p class="deck">${escapeHtml(deck)}</p>
    </header>
    <ol class="post-list">
      ${items || "<li><p>No posts in this section yet.</p></li>"}
    </ol>
    ${extra}`,
  });
}

function renderPost(post, posts) {
  const idx = posts.findIndex((p) => p.slug === post.slug);
  const newer = idx > 0 ? posts[idx - 1] : null;
  const older = idx < posts.length - 1 ? posts[idx + 1] : null;
  const extraHead = jsonLd({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    datePublished: post.date,
    dateModified: post.date,
    description: post.summary,
    url: `${SITE.origin}${post.path}`,
    image: `${SITE.origin}/journal/og.jpg`,
    author: personLd(),
    mainEntityOfPage: `${SITE.origin}${post.path}`,
    about: { "@type": "WebApplication", name: post.build, url: post.build_url },
  });

  const pager = `
    <nav class="pager" aria-label="Adjacent posts">
      ${older ? `<a class="pager-older" href="${older.path}"><span>Older</span>${escapeHtml(older.title)}</a>` : "<span></span>"}
      ${newer ? `<a class="pager-newer" href="${newer.path}"><span>Newer</span>${escapeHtml(newer.title)}</a>` : "<span></span>"}
    </nav>`;

  return layout({
    title: post.title,
    description: post.summary || SITE.description,
    path: post.path,
    type: "article",
    extraHead,
    bodyClass: "page-post",
    content: `
    <article class="post">
      <header class="post-head">
        <time datetime="${post.date}">${formatDate(post.date)}</time>
        <h1>${escapeHtml(post.title)}</h1>
      </header>
      ${renderWeekBuild(post)}
      <div class="prose">
        ${post.html}
      </div>
    </article>
    ${pager}`,
  });
}

function renderStaticPage(page, extra = "") {
  const updated = page.updated
    ? `<p class="deck"><time datetime="${page.updated}">Updated ${formatDate(page.updated)}</time></p>`
    : "";
  return layout({
    title: page.title,
    description: page.description,
    path: page.path,
    extraHead: extra,
    content: `
    <article class="post">
      <header class="page-head">
        <h1>${escapeHtml(page.title)}</h1>
        ${updated}
      </header>
      <div class="prose">
        ${page.html}
      </div>
    </article>`,
  });
}

function render404() {
  return layout({
    title: "Not found",
    description: "That page isn't on this site.",
    path: "/not-found/",
    extraHead: '<meta name="robots" content="noindex" />',
    content: `
    <header class="page-head">
      <h1>Not here</h1>
      <p class="deck">That address doesn't match a note. Try the <a href="/">home page</a> or <a href="/writing/">writing</a>.</p>
    </header>`,
  });
}

function renderRss(posts) {
  const items = posts
    .map((p) => {
      const url = `${SITE.origin}${p.path}`;
      return `    <item>
      <title>${escapeHtml(p.title)}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${new Date(p.date + "T12:00:00-05:00").toUTCString()}</pubDate>
      <description>${escapeHtml(`This week's build: ${p.build} — ${p.build_url}. ${p.summary || p.body.slice(0, 280)}`)}</description>
    </item>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE.name}</title>
    <link>${SITE.origin}/</link>
    <description>${escapeHtml(SITE.description)}</description>
    <language>en-us</language>
    <atom:link href="${SITE.origin}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

function renderSitemap(posts, pages) {
  const urls = [
    ["/", "weekly", "1.0"],
    ["/writing/", "weekly", "0.9"],
    ...pages.map((p) => [p.path, "monthly", "0.6"]),
    ...posts.map((p) => [p.path, "monthly", "0.8"]),
  ];
  const body = urls
    .map(
      ([loc, freq, pri]) => `  <url>
    <loc>${SITE.origin}${loc}</loc>
    <changefreq>${freq}</changefreq>
    <priority>${pri}</priority>
  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

function renderRobots() {
  return `User-agent: *
Allow: /

Sitemap: ${SITE.origin}/sitemap.xml
`;
}

function cleanGenerated() {
  const keep = new Set([
    "build.mjs",
    "styles.css",
    "script.js",
    "favicon.svg",
    "og.jpg",
    "README.md",
    "content",
  ]);
  for (const name of fs.readdirSync(ROOT)) {
    if (keep.has(name)) continue;
    fs.rmSync(path.join(ROOT, name), { recursive: true, force: true });
  }
}

const posts = loadPosts();
const mspPosts = posts.filter((p) => p.section === "msp");
const about = loadPage("about");
const now = loadPage("now");
const work = loadPage("work");
const privacy = loadPage("privacy");
const msp = loadPage("msp");
const pages = [about, now, work, privacy, msp];

cleanGenerated();

write(path.join(ROOT, "index.html"), renderHome(posts));
write(path.join(ROOT, "writing", "index.html"), renderArchive(posts));
write(
  path.join(ROOT, "writing", "msp", "index.html"),
  renderArchive(mspPosts, {
    title: "MSP writing",
    description: "MSP workflow and automation notes — Clinton, Missouri.",
    path: "/writing/msp/",
    deck: "Placeholder deck — David will rewrite. Posts with section: msp land here.",
    extraLinks: `<p class="more"><a href="/writing/">All writing</a> · <a href="/msp/">MSP highlights</a> · <a href="/rss.xml">RSS</a></p>`,
  })
);
for (const post of posts) {
  write(path.join(ROOT, "writing", post.slug, "index.html"), renderPost(post, posts));
}
write(path.join(ROOT, "about", "index.html"), renderStaticPage(about, jsonLd({
  "@context": "https://schema.org",
  ...personLd(),
})));
write(path.join(ROOT, "now", "index.html"), renderStaticPage(now));
write(
  path.join(ROOT, "work", "index.html"),
  layout({
    title: work.title,
    description: work.description,
    path: "/work/",
    bodyClass: "page-work",
    content: `${work.html ? `<div class="prose page-prose">${work.html}</div>` : ""}${renderBuiltBlock("personal")}`,
  })
);
write(
  path.join(ROOT, "msp", "index.html"),
  layout({
    title: msp.title,
    description: msp.description,
    path: "/msp/",
    bodyClass: "page-msp",
    content: `${msp.html ? `<div class="prose page-prose">${msp.html}</div>` : ""}${renderBuiltBlock("msp")}<p class="more"><a href="/writing/msp/">MSP writing</a></p>`,
  })
);
write(path.join(ROOT, "privacy", "index.html"), renderStaticPage(privacy));
write(path.join(ROOT, "not-found", "index.html"), render404());
write(path.join(ROOT, "rss.xml"), renderRss(posts));
write(
  path.join(ROOT, "sitemap.xml"),
  renderSitemap(posts, [...pages, { path: "/writing/msp/" }])
);
write(path.join(ROOT, "robots.txt"), renderRobots());

console.log(`Built ${posts.length} posts (${mspPosts.length} MSP), ${pages.length} pages.`);
for (const p of posts) console.log(`  ${p.date}  [${p.section}]  ${p.path}  ${p.title}`);
