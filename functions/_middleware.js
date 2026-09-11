/**
 * Host-aware routing for the shared Pages project.
 *
 * Cloudflare Pages `_redirects` cannot match on hostname
 * (domain-level redirects are unsupported). This middleware:
 *   1. 301 apex henrycountyconsulting.com → www
 *   2. 301 lab apps off the HCC host onto jamesnetworks.net
 *   3. Serves host-aware robots.txt
 *   4. Leaves jamesnetworks.net paths alone
 *
 * Unknown paths are NOT rewritten to index.html. 404.html handles those.
 */

const HCC_APEX = "henrycountyconsulting.com";
const HCC_WWW = "www.henrycountyconsulting.com";
const LAB_ORIGIN = "https://www.jamesnetworks.net";

const LAB_PREFIXES = [
  "/pool",
  "/cipherladder",
  "/netnudge",
  "/flowscout",
  "/mocks",
];

const ROBOTS_HCC = `User-agent: *
Allow: /

Sitemap: https://www.henrycountyconsulting.com/sitemap.xml
`;

const ROBOTS_LAB = `User-agent: *
Allow: /

Sitemap: https://www.jamesnetworks.net/sitemap-lab.xml
`;

function isHccHost(host) {
  return host === HCC_APEX || host === HCC_WWW;
}

function isLabPath(pathname) {
  return LAB_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const host = url.hostname.toLowerCase();

  if (host === HCC_APEX) {
    url.hostname = HCC_WWW;
    return Response.redirect(url.toString(), 301);
  }

  if (url.pathname === "/goldenbench" || url.pathname.startsWith("/goldenbench/")) {
    const dest = new URL("/", url);
    if (isHccHost(host)) dest.hostname = HCC_WWW;
    return Response.redirect(dest.toString(), 301);
  }

  if (isHccHost(host) && isLabPath(url.pathname)) {
    return Response.redirect(`${LAB_ORIGIN}${url.pathname}${url.search}`, 301);
  }

  if (url.pathname === "/robots.txt") {
    const body = isHccHost(host) ? ROBOTS_HCC : ROBOTS_LAB;
    return new Response(body, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });
  }

  return context.next();
}
