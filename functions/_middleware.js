/**
 * Host-aware routing for the shared Pages project.
 *
 *   henrycountyconsulting.com  → consulting site (root HTML)
 *   jamesnetworks.net          → personal journal (journal/)
 *
 * Cloudflare Pages `_redirects` cannot match on hostname.
 * Unknown paths are NOT rewritten to index.html. 404.html handles those.
 */

const HCC_APEX = "henrycountyconsulting.com";
const HCC_WWW = "www.henrycountyconsulting.com";
const JN_APEX = "jamesnetworks.net";
const JN_WWW = "www.jamesnetworks.net";
const HCC_ORIGIN = `https://${HCC_WWW}`;
const JN_ORIGIN = `https://${JN_WWW}`;

const LAB_PREFIXES = [
  "/pool",
  "/cipherladder",
  "/netnudge",
  "/flowscout",
  "/mocks",
];

const HCC_ONLY_PREFIXES = [
  "/services",
  "/about",
  "/faq",
  "/privacy",
  "/method",
  "/book",
  "/contact",
  "/how-it-works",
  "/ai-consulting-clinton-mo",
  "/workflow-automation",
];

const JOURNAL_STATIC = /\.(css|js|svg|jpg|jpeg|png|webp|ico)$/i;

function isHccHost(host) {
  return host === HCC_APEX || host === HCC_WWW;
}

function isJnHost(host) {
  return host === JN_APEX || host === JN_WWW;
}

function startsWithPrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isLabPath(pathname) {
  return LAB_PREFIXES.some((prefix) => startsWithPrefix(pathname, prefix));
}

function isHccOnlyPath(pathname) {
  return HCC_ONLY_PREFIXES.some((prefix) => startsWithPrefix(pathname, prefix));
}

function isApiPath(pathname) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function cookieValue(request, name) {
  const raw = request.headers.get("Cookie") || "";
  const match = raw.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function wantsJournal(request, url, host) {
  if (isHccHost(host)) return false;
  if (isJnHost(host)) return true;
  if (url.searchParams.get("site") === "hcc") return false;
  if (url.searchParams.get("site") === "journal") return true;
  return cookieValue(request, "jn_site") === "journal";
}

function mapJournalPath(pathname) {
  if (pathname === "/rss.xml" || pathname === "/feed.xml") return "/journal/rss.xml";
  if (pathname === "/sitemap.xml") return "/journal/sitemap.xml";
  if (pathname === "/robots.txt") return "/journal/robots.txt";
  if (pathname === "/favicon.ico" || pathname === "/favicon.svg") return "/journal/favicon.svg";
  if (pathname === "/" || pathname === "") return "/journal/";
  if (pathname.startsWith("/journal/") || pathname === "/journal") return pathname;
  // Explicit pretty routes (incl. MSP) → journal/ tree
  let mapped = `/journal${pathname}`;
  if (!mapped.includes(".") && !mapped.endsWith("/")) mapped += "/";
  return mapped;
}

function prettyFromJournal(pathname) {
  let rest = pathname.replace(/^\/journal/, "") || "/";
  if (rest === "/index.html") rest = "/";
  rest = rest.replace(/\/index\.html$/, "/");
  if (rest === "/not-found" || rest === "/not-found/") return null;
  return rest;
}

function withoutSiteParam(target) {
  const dest = new URL(target);
  dest.searchParams.delete("site");
  return dest;
}

function withOptionalCookie(res, cookie) {
  if (!cookie) return res;
  const headers = new Headers(res.headers);
  headers.append("Set-Cookie", cookie);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

function siteCookie(url) {
  const site = url.searchParams.get("site");
  if (site === "journal") {
    return "jn_site=journal; Path=/; Max-Age=86400; SameSite=Lax";
  }
  if (site === "hcc") {
    return "jn_site=; Path=/; Max-Age=0; SameSite=Lax";
  }
  return "";
}

/**
 * Serve a journal static path without re-entering this middleware.
 * context.next() can re-invoke onRequest and pretty-redirect /journal/msp/ → /msp/,
 * which breaks demo ?site=journal rewrites (and can 404 / loop).
 */
async function fetchMapped(context, pathname) {
  const dest = new URL(context.request.url);
  dest.pathname = pathname;
  dest.searchParams.delete("site");
  const req = new Request(dest.toString(), context.request);
  if (context.env && context.env.ASSETS && typeof context.env.ASSETS.fetch === "function") {
    return context.env.ASSETS.fetch(req);
  }
  return context.next(req);
}

function redirectWithCookie(location, cookie) {
  const res = Response.redirect(location, 301);
  return withOptionalCookie(res, cookie);
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const host = url.hostname.toLowerCase();
  const cookie = siteCookie(url);

  if (host === HCC_APEX) {
    url.hostname = HCC_WWW;
    return Response.redirect(url.toString(), 301);
  }

  if (host === JN_APEX) {
    url.hostname = JN_WWW;
    return Response.redirect(url.toString(), 301);
  }

  if (url.pathname === "/goldenbench" || url.pathname.startsWith("/goldenbench/")) {
    const dest = new URL("/", url);
    if (isHccHost(host)) dest.hostname = HCC_WWW;
    if (isJnHost(host)) dest.hostname = JN_WWW;
    return Response.redirect(dest.toString(), 301);
  }

  if (isHccHost(host) && isLabPath(url.pathname)) {
    return Response.redirect(withoutSiteParam(`${JN_ORIGIN}${url.pathname}${url.search}`).toString(), 301);
  }

  if (isHccHost(host) && (url.pathname === "/journal" || url.pathname.startsWith("/journal/"))) {
    if (JOURNAL_STATIC.test(url.pathname)) return context.next();
    const pretty = prettyFromJournal(url.pathname);
    if (!pretty) return context.next();
    return Response.redirect(`${JN_ORIGIN}${pretty}`, 301);
  }

  if (!wantsJournal(context.request, url, host)) {
    return context.next();
  }

  if (isHccOnlyPath(url.pathname)) {
    return Response.redirect(withoutSiteParam(`${HCC_ORIGIN}${url.pathname}${url.search}`).toString(), 301);
  }

  if (
    isLabPath(url.pathname) ||
    isApiPath(url.pathname) ||
    url.pathname.startsWith("/assets/") ||
    url.pathname === "/msp" ||
    url.pathname.startsWith("/msp/")
  ) {
    return withOptionalCookie(await context.next(), cookie);
  }

  if (url.pathname === "/journal" || url.pathname.startsWith("/journal/")) {
    if (JOURNAL_STATIC.test(url.pathname)) {
      return withOptionalCookie(await context.next(), cookie);
    }
    const pretty = prettyFromJournal(url.pathname);
    if (pretty && pretty !== url.pathname) {
      const dest = new URL(pretty, url);
      dest.search = url.search;
      dest.searchParams.delete("site");
      // Keep journal mode on demo after stripping ?site=journal
      return redirectWithCookie(dest.toString(), cookie || "jn_site=journal; Path=/; Max-Age=86400; SameSite=Lax");
    }
    return withOptionalCookie(await context.next(), cookie);
  }

  const mapped = mapJournalPath(url.pathname);
  let res = await fetchMapped(context, mapped);

  if (res.status === 404) {
    // Try index.html explicitly (some runtimes 404 on directory URLs via ASSETS)
    if (mapped.endsWith("/") && !mapped.endsWith("/index.html")) {
      const indexed = await fetchMapped(context, `${mapped}index.html`);
      if (indexed.status === 200) {
        res = indexed;
      }
    }
  }

  if (res.status === 404) {
    let notFound = await fetchMapped(context, "/journal/not-found/");
    if (notFound.status === 404) {
      notFound = await fetchMapped(context, "/journal/not-found/index.html");
    }
    if (notFound.status >= 300 && notFound.status < 400) {
      const loc = notFound.headers.get("Location");
      if (loc) {
        const dest = new URL(loc, url);
        notFound = await fetchMapped(context, dest.pathname);
      }
    }
    const headers = new Headers(notFound.headers);
    headers.delete("Location");
    headers.set("Cache-Control", "no-store");
    res = new Response(notFound.body, { status: 404, headers });
  } else if (mapped.endsWith("rss.xml")) {
    const headers = new Headers(res.headers);
    headers.set("Content-Type", "application/rss+xml; charset=utf-8");
    res = new Response(res.body, { status: res.status, headers });
  }

  return withOptionalCookie(res, cookie);
}
