# James Networks (`www.jamesnetworks.net`)

**James Networks** is the umbrella — a **network of businesses**.

## Brand structure

| Name | Role |
|------|------|
| **James Networks** | Parent brand / network of businesses |
| **Business Workflow Automation and Agentic Creation** | Primary services — workflows, orchestration, agentic systems |
| **AI for Missouri** | Education & SMB AI (aiformissouri.com) |
| **Apps** | APA Captain, Rural Roots Hub, more |

## Live intent

| Item | Value |
|------|--------|
| Domain | [www.jamesnetworks.net](https://www.jamesnetworks.net) |
| Stack | Static HTML / CSS / JS (no build step) |
| Suggested host | Cloudflare Pages |
| Logo | `assets/logo.jpg` — geometric J + circuit mark |

## Local preview

```bash
npx --yes serve .
```

## Deploy (Cloudflare Pages)

| Item | Value |
|------|--------|
| **Project** | `jamesnetworks-net` |
| **Git** | `mrdjames-us/jamesnetworks-net` → branch `main` (auto-deploy) |
| **Build** | empty · output: `/` (static) |
| **Pages URL** | https://jamesnetworks-net.pages.dev |
| **Custom domains** | `www.jamesnetworks.net`, `jamesnetworks.net` (in CF; DNS must point here) |

### Squarespace DNS (zone is on Squarespace)

Point custom domains at the Pages project:

| Host | Type | Data |
|------|------|------|
| `www` | **CNAME** | `jamesnetworks-net.pages.dev` |
| `@` (apex) | **CNAME** / ALIAS if Squarespace allows | `jamesnetworks-net.pages.dev` |

If apex CNAME isn’t allowed, CNAME `www` only and 301 apex → `www` in Squarespace.

Remove any old `www` record pointing at `ghs.googlehosted.com` (previous host).

SSL is automatic once Cloudflare sees the CNAME (Google CA).

## Docs

- [BUSINESS-PLAN.md](./BUSINESS-PLAN.md) — Business Workflow Automation and Agentic Creation plan
