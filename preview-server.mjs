#!/usr/bin/env node
/**
 * Local stand-in for the Cloudflare Pages journal host.
 * www.jamesnetworks.net rewrites most paths into journal/ (see functions/_middleware.js).
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8080;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
};

const LAB = ["/pool", "/cipherladder", "/netnudge", "/flowscout", "/mocks"];
const STATIC = /\.(css|js|svg|jpg|jpeg|png|webp|gif|ico|xml|txt|json|woff2)$/i;

function startsWithPrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function mapJournalPath(pathname) {
  if (pathname === "/rss.xml" || pathname === "/feed.xml") return "/journal/rss.xml";
  if (pathname === "/sitemap.xml") return "/journal/sitemap.xml";
  if (pathname === "/robots.txt") return "/journal/robots.txt";
  if (pathname === "/favicon.ico" || pathname === "/favicon.svg") return "/journal/favicon.svg";
  if (pathname === "/" || pathname === "") return "/journal/";
  if (pathname === "/journal" || pathname.startsWith("/journal/")) {
    if (STATIC.test(pathname) || pathname.endsWith("/")) return pathname;
    return `${pathname}/`;
  }
  if (
    LAB.some((prefix) => startsWithPrefix(pathname, prefix)) ||
    pathname.startsWith("/assets/") ||
    pathname === "/msp" ||
    pathname.startsWith("/msp/") ||
    pathname.startsWith("/api/")
  ) {
    return pathname;
  }
  let mapped = `/journal${pathname}`;
  if (!STATIC.test(mapped) && !mapped.endsWith("/")) mapped += "/";
  return mapped;
}

function insideRoot(abs) {
  const root = path.resolve(ROOT);
  const resolved = path.resolve(abs);
  return resolved === root || resolved.startsWith(root + path.sep);
}

function safeFile(urlPath) {
  let rel = decodeURIComponent(urlPath.split("?")[0]);
  rel = rel.replace(/^\/+/, "");
  const abs = path.resolve(ROOT, rel);
  if (!insideRoot(abs)) return null;
  return abs;
}

function resolveFile(pathname) {
  const mapped = mapJournalPath(pathname);
  const abs = safeFile(mapped);
  if (!abs) return null;
  const candidates = [abs];
  if (mapped.endsWith("/")) candidates.push(path.join(abs, "index.html"));
  else {
    candidates.push(`${abs}.html`);
    candidates.push(path.join(abs, "index.html"));
  }
  for (const candidate of candidates) {
    if (!insideRoot(candidate)) continue;
    try {
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch {
      /* missing */
    }
  }
  return null;
}

function notFoundFile() {
  for (const rel of ["journal/not-found/index.html", "404.html"]) {
    const abs = path.join(ROOT, rel);
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const pathname = url.pathname;

  if (pathname === "/goldenbench" || pathname.startsWith("/goldenbench/")) {
    res.writeHead(301, { Location: "/" });
    res.end();
    return;
  }

  if (
    (pathname === "/journal" || pathname.startsWith("/journal/")) &&
    !STATIC.test(pathname)
  ) {
    let rest = pathname.replace(/^\/journal/, "") || "/";
    rest = rest.replace(/\/index\.html$/, "/");
    if (rest === "/index.html") rest = "/";
    if (rest !== "/not-found" && rest !== "/not-found/" && rest !== pathname) {
      res.writeHead(301, { Location: rest + url.search });
      res.end();
      return;
    }
  }

  const file = resolveFile(pathname);
  if (!file) {
    const missing = notFoundFile();
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    if (req.method === "HEAD" || !missing) {
      res.end(missing ? undefined : "Not found");
      return;
    }
    fs.createReadStream(missing).pipe(res);
    return;
  }

  const ext = path.extname(file).toLowerCase();
  let type = TYPES[ext] || "application/octet-stream";
  if (file.endsWith("rss.xml")) type = "application/rss+xml; charset=utf-8";
  res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, "0.0.0.0");
