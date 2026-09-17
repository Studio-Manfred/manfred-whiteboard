# Ways of working — AI-assisted software development

> Reference doc for training, onboarding, and the conference deck.
> Worked example throughout: **{{LINEAR_PREFIX}}-501 — keyboard navigation in a search panel**, shipped end-to-end in one session.
> Written stack-agnostically. Where the concrete example is from the Manfred intranet (Vite + React SPA + Supabase + Vercel), that is called out. The way of working applies across projects regardless of backend or deployment target.

---

## 0. The one idea behind all of it

AI is not autocomplete. It is a disciplined teammate that follows a written process. The leverage is not that the model writes code fast — it is that **the process is encoded in files the model reads every session**, so the quality bar is the same whether you are watching closely or not.

Three files carry most of that work:

| File | Role | When it is loaded |
|---|---|---|
| `AGENTS.md` | Operational guardrails — stack, commands, the per-PR rhythm, governance rules. Read first in every session. | Top of every session |
| `CLAUDE.md` | Project operating manual — anything `AGENTS.md` does not cover: project-specific conventions, sharp edges, Linear prefix. | Every session |
| `MEMORY.md` | Session handoff log — what shipped, decisions made, where to pick up. Newest entry on top. | Recalled by relevance |

Everything below is the elaboration of those three files. The single takeaway: **write the process down where the AI reads it, and make every session improve it.**

The canonical versions of `AGENTS.md`, `CLAUDE.md`, and `MEMORY.md` live in `../starter/`. Each new project inherits them via `scripts/bootstrap.mjs` and then fills in the project-specific blanks.

---

## 1. Idea → Brainstorming

**Trigger:** a screenshot, a message, a "wouldn't it be nice if…".

Never let the AI jump straight to code on a creative or design task. There is a hard gate: a `brainstorming` skill that must run before any implementation skill, and it refuses to write code until a design is approved.

How it works:

1. **Explore context first** — the AI reads the relevant files, recent commits, and existing patterns before asking anything.
2. **One question at a time.** Multiple-choice when possible. Not a wall of ten questions.
3. **Two or three approaches with trade-offs**, and a recommendation with reasoning.
4. **Design presented in sections**, each approved before moving on.
5. For anything non-trivial, the design is written to a spec file at `docs/superpowers/specs/` and reviewed before planning starts.

> **Worked example.** When the prompt was "global footer, different config per app, let's brainstorm," the AI went into brainstorming mode: explored the codebase (found there was no footer yet), then asked what actually varies per app before proposing a config model. When the answer was "wait with this," it stopped — nothing was created. That restraint is the point.

**Teachable principle:** the most expensive bugs are unexamined assumptions. Five minutes of structured questions saves an afternoon of building the wrong thing.

---

## 2. Planning

Once a design is approved, a separate `writing-plans` step turns it into an ordered implementation plan: critical files, step sequence, risks, and decomposition into bite-sized tasks.

- **Big work gets decomposed** into independent sub-projects, each with its own spec → plan → implement cycle.
- Plans are saved to `docs/superpowers/plans/` and committed, so the plan outlives the chat.
- Each task in the plan is sized for TDD: one behaviour, one failing test, one green.

**Teachable principle:** plan in a file, not in the chat buffer. Chats get compacted; files do not.

---

## 3. Linear — tickets, epics, milestones

**The Linear ticket exists before the branch.** This is the single most important habit.

### Ticket-first rule

Every piece of work — even a one-liner — gets a `{{LINEAR_PREFIX}}-NNN` ticket first. The ticket ID becomes the canonical anchor that threads through everything:

- Branch name: `feat/{{LINEAR_PREFIX}}-NNN-short-desc`
- Commit and PR title: `feat(scope): summary ({{LINEAR_PREFIX}}-NNN)`
- Test descriptions: `test.describe('Feature name ({{LINEAR_PREFIX}}-NNN)')`
- Code comments for partial work: `// {{LINEAR_PREFIX}}-NNN: …`
- Knowledge and ERRORS entries: each names the ticket that surfaced it

Searching the codebase for `{{LINEAR_PREFIX}}-501` returns every file the work touched. Searching Linear for `{{LINEAR_PREFIX}}-501` surfaces every commit and PR. **The ID is the join key between the two systems.**

### Epics and children

Large initiatives are an epic (umbrella ticket) plus children — one child per phase, each one PR. Projects in Linear group the epics.

### Milestones and estimates

Estimates live on the ticket but treat them as scope-naive until you have actually grepped the codebase — lint output and file counts are the source of truth for "how big is this," not the estimate. Status flows: Backlog → In Progress (auto, when the branch opens) → Done (auto, on merge).

### Write discipline

- **Auto-close via the PR body (`Closes {{LINEAR_PREFIX}}-NNN`) is fine** — no permission needed.
- **Any manual Linear comment or status change needs explicit human OK, per PR.** The AI never edits a shared tracker without asking. This prevents spamming a system other people depend on.

**Teachable principle:** the tracker is shared and outward-facing. Reads are free; writes need a human's nod.

---

## 4. Branching and naming

### Branching

- Always branch off `main`: `git checkout -b feat/{{LINEAR_PREFIX}}-NNN-short-description`.
- WIP commits are fine — squash-merge on GitHub means the branch history is disposable.
- Rebase onto `main` only if `main` moved while you worked. Otherwise just push.
- Never force-push to `main`. Feature branches are fair game.

### Conventional commits

`type(scope): summary ({{LINEAR_PREFIX}}-NNN)` — e.g. `feat(search): keyboard navigation in global search panel ({{LINEAR_PREFIX}}-501)`.

Because we squash-merge, **the PR title is the permanent record in `main`** — so it must be conventional-commit shaped and meaningful.

### File-naming conventions

Match the naming convention of the directory you are in:

| Thing | Convention | Example |
|---|---|---|
| Page components | PascalCase `.tsx` | `Search.tsx`, `CardDetail.tsx` |
| UI primitives / design-system pieces | kebab-case `.tsx` | `page-title.tsx`, `error-boundary.tsx` |
| Pure logic helpers | kebab-case `.ts` in `src/lib/` | `search-keyboard-nav.ts` |
| Scripts | kebab-case `.mjs` / `.js` | `coverage-ratchet.mjs` |

**Teachable principle:** consistency beats preference. The AI matches the surrounding code's idiom rather than imposing its own.

---

## 5. Test-Driven Development — the core discipline

TDD is what makes AI-written code trustworthy.

### The Iron Law

> **No production code without a failing test first.** If you wrote code before the test, delete it and start over.

Red → Green → Refactor:

1. **RED** — write one minimal test for one behaviour. Run it. Watch it fail for the right reason.
2. **GREEN** — the simplest code that passes. Nothing more (YAGNI).
3. **REFACTOR** — clean up while staying green.

The "watch it fail" step is non-negotiable: a test written after the code passes immediately and proves nothing.

### When TDD triggers

A diff that touches any of these writes the failing test first:

- `src/lib/` · `src/hooks/`
- Stateful components (`useState` / `useEffect` / `setInterval` / refs)
- Data fetches, API wrappers, network utilities
- Modules with state / intervals / regex / redirects
- Bug fixes — write the regression test before writing the fix

Exempt: purely presentational markup, copy edits, config, docs.

### The key tactic: extract a helper, not the giant component

Page components grow large and have no test harness. Instead of fighting to test the component directly, **lift the changed logic into a pure function in `src/lib/` and unit-test that.**

> **Worked example — {{LINEAR_PREFIX}}-501.** The feature was "arrow keys move a highlight." Instead of testing the 1,000-line page component, I extracted `nextActiveIndex(current, key, length)` into `src/lib/search-keyboard-nav.ts` — pure index math (wrap both ends, clamp stale index, `-1` = nothing active). Nine Vitest cases, written red (module did not exist → import fails) → green. The component then just wires the tested helper. The logic is provable; the wiring is thin.

### Two regression-locking patterns

- **`test.fail()` regression-locking** — when a fix is not landed yet, ship the regression test marked as "expected to fail." The day the fix lands, the test goes green, the runner flips it red ("expected to fail but passed"), and the fix-PR's job is to remove the marker — graduating it into a real green test.
- **Warn-only-with-enforce-flag ratchet** — for whole categories of pre-existing issues (axe, jsx-a11y, the CI lint step), default to soft mode with a flag to flip strict. Each shipped fix demotes one rule from warn to error. Turns "we'll fix it someday" into a monotonic ratchet that can only tighten. In this starter, the axe ratchet is `AXE_ENFORCE=1` (see `../starter/.github/workflows/ci.yml`).

**Teachable principle:** AI is fastest when the target is a failing test. A precise red test is a far better prompt than a paragraph of English.

---

## 6. The testing pyramid — every layer

Test infrastructure is fully wired and a monotonic coverage ratchet guards `main` (coverage can only go up, within a 0.5% tolerance — see `../starter/scripts/coverage-ratchet.mjs`).

```
              ┌──────────────────────────────┐
              │  Deployed-smoke (UI)         │  Playwright vs real preview URL
              │  advisory, on every preview  │
              ├──────────────────────────────┤
              │  E2E (Playwright)            │  mock backend, desktop + mobile
              │  auth, flows, navigation     │
              ├──────────────────────────────┤
              │  A11y (axe-core + jsx-a11y)  │  warn-only → enforce ratchet
              ├──────────────────────────────┤
              │  Integration (vitest + RTL)  │  hooks, data layers, editors
              ├──────────────────────────────┤
              │  Unit (vitest, pure)         │  helpers, reducers, validators
              ├──────────────────────────────┤
              │  Static (ESLint, jsx-a11y,   │  continuous, at edit time
              │  react-hooks, typescript)    │
              └──────────────────────────────┘
```

### Unit and integration — Vitest

Vitest + `@testing-library/react` + jsdom (or happy-dom for speed) + MSW for network mocking. Pure logic in `src/lib/` is the bottom-heavy base of the pyramid. The starter is wired at `../starter/vitest.config.ts`.

```bash
npm test                 # watch
npm run test:run         # one-shot
npm run test:coverage    # → ./coverage/
npm run coverage:check   # ratchet — fails if coverage drops > 0.5% below baseline
```

### E2E — Playwright against a mock backend

E2E tests run against a mock backend server — no real external service, offline, deterministic. Wire the mock per project. In the intranet that is a tiny Node HTTP server that emulates Supabase PostgREST. Two browser projects: Chromium-desktop + Chromium-mobile (Pixel 5). The starter's Playwright config is at `../starter/playwright.config.ts`.

```bash
npm run test:e2e         # builds + runs
npm run test:e2e:ui      # UI mode
```

Hard-won E2E gotchas: **rebuild before re-running** (`vite preview` serves stale `dist/`); shared mock state means parallel workers need unique seed data; never assert on locale-dependent strings.

> **Worked example — {{LINEAR_PREFIX}}-501.** Three E2E tests: arrow-move + wrap, Enter → navigate, Escape closes. To honour "watch it fail" for the integration layer, I swapped in the old production `Search.jsx`, rebuilt, ran → all 3 red; restored the new code, rebuilt → green. TDD applied to E2E, not just units.

### Accessibility — first-class, not an afterthought

- `@axe-core/playwright` sweeps rendered pages — warn-only by default, `AXE_ENFORCE=1` flips it merge-blocking.
- `eslint-plugin-jsx-a11y` catches issues at edit time (rules at `warn`, demoted to `error` one at a time per the ratchet).
- Every interactive feature gets ARIA wired: {{LINEAR_PREFIX}}-501 added the full combobox/listbox pattern (`role="combobox"` + `aria-activedescendant` on the input, `role="option"` + `aria-selected` on rows) so keyboard state is announced to screen readers.
- Dedicated a11y skills (`a11y-design`, `a11y-dev`, `a11y-qa`) carry WCAG 2.2 AA knowledge.

See the starter's a11y E2E spec at `../starter/e2e/a11y.spec.ts`.

### Deployed-smoke (UI smoke against the real preview)

Advisory Playwright run against the actual hosting preview URL, triggered when a preview deploy succeeds. Doesn't gate merge — posts a pass/fail comment on the PR. Production smoke runs only via manual trigger.

**Teachable principle:** match the test layer to the risk. Pure logic → unit. Wiring → E2E against a mock. "Does it actually work on the real host" → deployed-smoke.

---

## 7. Multi-agent orchestration

For work that is broad or benefits from independent perspectives, fan out subagents instead of doing everything in one context.

Patterns:

- **Parallel independent tasks** — N agents on N non-overlapping pieces, results collected by the orchestrator.
- **Adversarial verification** — one agent finds candidates, then separate agents try to refute each one; only findings that survive get reported.
- **Read-only exploration** — an explore-style agent sweeps many files and returns just the conclusion, keeping raw file dumps out of the main context.

> **Worked example — security review.** A `web-security-auditor` subagent traced every trust boundary. Findings would each get a parallel false-positive-filter subagent with a confidence score; only confidence ≥ 8 survives. When the auditor found nothing, nothing was reported — findings are not fabricated to fill a Linear epic.

Two governance rules:

- **Subagents do not write `MEMORY.md` or docs mid-task** — they would each scribble handoff notes otherwise. Subagents return data; the orchestrator decides.
- **Judgement calls stay in one place** — the orchestrator, not the subagents.

**Teachable principle:** parallelism for coverage, adversarial agents for confidence. A finding that survives three skeptics is worth more than one a single agent asserted.

---

## 8. Connecting to GitHub

- The AI drives GitHub through the `gh` CLI: branch, push, open PR, watch CI, merge.
- **PRs use a template** (`../starter/.github/PULL_REQUEST_TEMPLATE.md`): Summary / Why / Test plan / Tests added (the TDD checkbox enforces the rule at review time) / Coverage / Linked issues.
- PR body always ends with `Closes {{LINEAR_PREFIX}}-NNN` for the Linear auto-link.
- **Squash-and-merge** into `main` — the PR title becomes the commit subject. WIP commits vanish.
- After opening a PR, verify CI actually triggered (`gh run list --event pull_request`) — a PR showing only hosting checks can mean Actions silently did not fire.

**Teachable principle:** the PR is the unit of review and the permanent record. Make the title and body carry their weight.

---

## 9. CI — GitHub Actions

`../starter/.github/workflows/ci.yml` runs on every PR and push to `main`, with `paths-ignore: ["**/*.md"]` so docs-only changes do not burn CI. Two required jobs:

| Job | What it runs | Gate |
|---|---|---|
| **`verify`** | lint → typecheck → unit + component with coverage → coverage ratchet → build | Blocks merge |
| **`e2e`** | Playwright, desktop + mobile (`needs: verify`) | Blocks merge |

Plus advisory workflows: deployed-smoke against the preview URL, and any backend/edge test jobs your project adds.

Deliberate design choices:

- **Lint is `continue-on-error`** initially — pre-existing errors stay visible in the log without blocking every merge. Create a ticket to clean them and flip the flag off once done.
- **`continue-on-error: true` is a trap** — it masks real failures as green. Use it only for genuinely advisory jobs.
- **Concurrency** cancels superseded PR runs.

> **Worked example — {{LINEAR_PREFIX}}-501.** Before merging, confirmed the CI workflow triggered (not just the hosting preview), then watched all jobs settle green: verify + coverage ratchet, Playwright desktop + mobile. Only then squash-merged.

---

## 10. Release to Vercel

- The starter is a **Vite SPA on Vercel**; `../starter/vercel.json` rewrites all routes to `/index.html`.
- **Every PR gets an automatic Vercel preview deploy** — that is what deployed-smoke and any manual walkthrough run against.
- **Squash-merge to `main` → Vercel auto-deploys production.** No manual release step for this project type.
- Vercel guardrails: this is a Vite SPA, not Next.js — no Server Components or route handlers; `vercel.json` over `vercel.ts` (the platform validator may reject `vercel.ts` schemas the local validator accepts); static files in `public/` beat the SPA rewrite.

**Teachable principle:** preview-URL ceremony is the highest-leverage shipping layer — see the change running on real infrastructure before it merges.

---

## 11. Security

Security is wired into the process, not bolted on. The threat model and chokepoints should be documented in `docs/knowledge/` or the project's `knowledge/` folder.

Three categories every project should address:

1. **HTML render safety** — any raw-HTML render must go through a sanitiser (e.g. DOMPurify with an `afterSanitizeAttributes` hook). Lock it with a regression spec so it cannot silently come back.
2. **Input validation at trust boundaries** — every endpoint or function that takes user input validates type, shape, and length before use. Wire CORS, validation, and rate-limiting helpers and test them.
3. **No secrets in the client bundle** — any variable prefixed `VITE_` ships in the browser bundle. Secrets belong only in server-side env, edge function secrets, or a server proxy.

Process habits:

- Run the `/security-review` skill periodically. It uses adversarial subagents (find → refute → confidence-score) and only reports high-confidence findings.
- Ship new security headers in report-only mode first; promote to enforced after observing real traffic.
- Keep an inventory doc for each cross-cutting policy (e.g. which call sites render HTML, which edge functions exist and what they accept).

**Teachable principle:** put the guard at the chokepoint, then a test that cannot regress. One sanitiser + one spec beats reviewing every render site by eye.

---

## 12. Linting and code standards

- **ESLint flat config** (`../starter/eslint.config.js`), ESLint 9.
- `eslint-plugin-jsx-a11y` (accessibility at edit time), `eslint-plugin-react-hooks` (detects misuse of hooks and stale closures), `eslint-plugin-react-refresh`.
- **Do not let the AI autonomously rewrite `react-hooks` compiler errors** — they flag subtle runtime behaviour (cascading renders, refs-during-render) in code that may have no test coverage. A human reviews each. Mechanical fixes (`no-unused-vars`, `no-undef`) are fine to do automatically.
- CSS standard: universal resets must live inside `@layer base`. Tailwind v4 puts utilities in `@layer utilities`, and un-layered CSS beats layered CSS regardless of specificity — keep resets layered to avoid surprise overrides.

**Teachable principle:** not every lint error is safe to auto-fix. Distinguish mechanical from behavioural; gate the behavioural ones on a human.

---

## 13. Dev frameworks and stack

See `./stack-and-conventions.md` for the full stack breakdown and conventions.

The short version: React 19 + Vite + TypeScript + Tailwind v4 + shadcn/Radix + `@studio-manfred/manfred-design-system`, Vitest + Playwright + axe, GitHub Actions, Vercel, Linear.

The key guardrail: **the way of working is portable; the stack guardrails are per-repo.** Each project's `AGENTS.md` declares what the stack actually is for that repo, so the AI cannot assume Next.js, or Supabase, or any other choice that varies between projects.

---

## 14. Knowledge management — the flywheel

This is what makes the whole thing compound over time.

- **`knowledge/INDEX.md`** routes to domain and procedural docs. Progressive disclosure — read top-down, load only what you need. The starter template is at `../starter/knowledge/INDEX.md`.
- **`knowledge/ERRORS.md`** logs errors. Deterministic ones get a same-session conclusion; infrastructure ones get logged until a pattern emerges, then graduate into a domain or procedural doc.
- **`MEMORY.md`** — session handoff log, newest on top, so the next session has a starting point.
- **`docs/knowledge/`** — team-level, curated, cross-project truths that have graduated up from individual project `knowledge/` folders.

> **Worked example — {{LINEAR_PREFIX}}-501 close-out.** After merge: updated `CHANGELOG.md` + project `MEMORY.md` in the same PR, then saved one reusable auto-memory — "keyboard list-nav + combobox-ARIA pattern: copy the `nextActiveIndex` helper for any future menu/autocomplete." The next time an autocomplete is built, that pattern is one recall away.

**Teachable principle:** every session should leave the knowledge base better than it found it. The AI gets more useful on this project specifically, because the learnings are written down where it reads them.

---

## 15. The per-feature rhythm

This is the end-to-end loop, battle-tested across dozens of PRs:

1. **Linear ticket** exists first — file one if needed.
2. **Brainstorm** if it is creative or design-heavy; skip if it is mechanical.
3. **Branch** off `main`: `feat/{{LINEAR_PREFIX}}-NNN-…`.
4. **Failing test first** (when the TDD trigger list applies) — watch it fail.
5. **Implement** until green locally.
6. **Update docs in the same PR** — CLAUDE.md / README / CHANGELOG / MEMORY / knowledge / ERRORS.
7. **Conventional commit** naming the ticket.
8. **Push, open PR** with the template filled and `Closes {{LINEAR_PREFIX}}-NNN`.
9. **Verify CI triggered**, iterate on red checks via force-push to the feature branch.
10. **Squash-merge** on green.
11. **Pull main**, verify the Linear ticket auto-closed.
12. **Save learnings** to MEMORY and knowledge.

The discipline is boring on purpose — boring is what makes AI output trustworthy at speed.
