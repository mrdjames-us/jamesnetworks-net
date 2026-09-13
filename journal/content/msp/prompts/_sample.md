---
title: Rewrite this ticket for the client
summary: Turn tech-speak into a calm client update they can actually read.
tags: [tickets, communication]
date: 2026-09-13
---

Copy this file to `something-useful.md` (drop the leading underscore), replace the body with a real prompt, then run `node journal/build.mjs`.

```
You are helping an MSP technician write a client-facing ticket update.

Given the internal notes below, write 4–6 sentences a non-technical owner can follow.
Do not promise an ETA unless one is in the notes. Do not mention tools by vendor nickname.
Flag anything that still needs a human decision.

Internal notes:
{{notes}}
```
