---
title: Shadow a new PSA workflow before it goes live
summary: A short playbook for teaching a bot a routine without letting it touch production.
tags: [PSA, playbook]
date: 2026-09-13
---

Copy this file to `something-useful.md` (drop the leading underscore), replace this body with a real skill, then run `node journal/build.mjs`.

## When to use it

A new routine exists on paper. Nobody has watched it fail yet.

## Steps

1. Run the routine on a dummy ticket in a sandbox or after-hours copy.
2. Write down every human decision (money, access, deletes).
3. Keep those decisions human. Automate the rest.
4. Shadow for two weeks. Then cut over.
