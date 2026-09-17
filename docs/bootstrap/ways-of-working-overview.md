# Ways of working — one-page overview

> Companion to [ways-of-working.md](./ways-of-working.md). Built for a slide or handout.
> **The big idea:** the process lives in files the AI reads every session (`AGENTS.md` → `CLAUDE.md` → `MEMORY.md`). The AI is a disciplined teammate, not autocomplete.

---

## The pipeline

```
Idea → Brainstorm → Plan → Ticket({{LINEAR_PREFIX}}-NNN) → Branch → RED test → GREEN code
  → Refactor + Docs → PR (Closes {{LINEAR_PREFIX}}-NNN) → CI (verify / e2e)
  → Hosting preview → Squash-merge → Auto-deploy → Save learnings ─┐
   ↑─────────────────── knowledge flywheel ────────────────────────┘
```

Each step feeds the next; the loop closes by writing what was learned back into the files the AI reads next session.

---

## Phases at a glance

| # | Phase | What happens | Tool / artifact |
|---|---|---|---|
| 1 | **Idea** | Screenshot, message, pain point | — |
| 2 | **Brainstorm** | One question at a time → 2–3 options → approved design. No code before approval. | `brainstorming` skill → `docs/superpowers/specs/` |
| 3 | **Plan** | Ordered steps, files, risks; big work decomposed into bite-sized TDD tasks. | `writing-plans` → `docs/superpowers/plans/` |
| 4 | **Ticket** | `{{LINEAR_PREFIX}}-NNN` created before the branch. The join key for code ↔ tracker. | Linear (epics + children) |
| 5 | **Branch** | `feat/{{LINEAR_PREFIX}}-NNN-desc` off `main`. | git |
| 6 | **TDD** | Failing test first → minimal code → refactor. | Vitest / Playwright |
| 7 | **Docs** | CHANGELOG + MEMORY + knowledge, same PR. | markdown |
| 8 | **PR** | Template + `Closes {{LINEAR_PREFIX}}-NNN`; squash-merge. | `gh` CLI, GitHub |
| 9 | **CI** | `verify` (lint · typecheck · unit · coverage ratchet · build) + `e2e` must be green. | GitHub Actions |
| 10 | **Ship** | Hosting preview → deployed-smoke → merge → prod. | Vercel (or your host) |
| 11 | **Learn** | Save reusable patterns; close the loop. | MEMORY.md, knowledge/ |

---

## Tooling at a glance

| Concern | Tool |
|---|---|
| Framework | React 19 + Vite SPA + TypeScript · Tailwind v4 · shadcn/Radix + Manfred DS |
| Hosting | Vercel (preview per PR → prod on merge) |
| Unit / integration | Vitest + Testing Library + jsdom + MSW |
| E2E | Playwright + mock backend (desktop + mobile) |
| UI smoke | Deployed-smoke vs real preview (advisory) |
| A11y | axe-core + jsx-a11y (warn → enforce ratchet) + WCAG 2.2 AA |
| Coverage | v8 + monotonic ratchet (only goes up) |
| Lint | ESLint 9 flat config + react-hooks + jsx-a11y |
| Security | Sanitiser chokepoint · input validation · no secrets in client · `/security-review` adversarial agents |
| Tracker | Linear (`{{LINEAR_PREFIX}}-NNN` anchor, auto-close via PR body) |
| Knowledge | AGENTS.md → CLAUDE.md → MEMORY.md → knowledge/ + docs/knowledge/ |

---

## Five principles to teach

1. **Write the process where the AI reads it.** `AGENTS.md` / `CLAUDE.md` / `MEMORY.md` are the leverage — not clever prompts.
2. **A failing test is the best prompt.** TDD makes AI-written code trustworthy; extract a pure helper rather than testing a 1,000-line component.
3. **The ticket ID is the join key.** `{{LINEAR_PREFIX}}-NNN` threads idea → branch → commit → PR → test → tracker. One search finds everything.
4. **Guard at the chokepoint, lock with a test.** One sanitiser + one regression spec beats reviewing every call site by eye. Same logic applies to the warn→enforce ratchets.
5. **Every session improves the knowledge base.** Learnings get written down; the AI compounds on this project specifically.

---

## Governance guardrails (what the AI must ask before doing)

- Auto-close a ticket via `Closes {{LINEAR_PREFIX}}-NNN` in the PR body — **fine, no ask.**
- Post a comment or change status in Linear — **needs human OK, per PR.**
- Rewrite `react-hooks` compiler errors — **human reviews each** (mechanical lint fixes are fine solo).
- Fabricate findings to fill an epic — **never**; a clean review reports clean.
- Force-push to `main` — **never** (feature branches only).
- Subagents writing docs or MEMORY mid-task — **blocked**; the orchestrator owns the writes.
- Destructive or irreversible actions (data deletion, migrations, deploys to production) — **ask first.**
