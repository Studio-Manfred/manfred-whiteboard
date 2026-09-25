# AGENTS.md — manfred-whiteboard

Operational guidance for AI agents (and humans) in this repo. Claude Code loads
this via `@AGENTS.md` from `CLAUDE.md`. Keep it short and current.

## What this is


## Stack
React 19 + Vite + Tailwind v4 + shadcn/Radix + `@studio-manfred/manfred-design-system`.
Vitest + Testing Library (unit/component), Playwright + axe-core (E2E + a11y), ESLint
flat config with `jsx-a11y`. Hosted on Vercel.

## Commands
| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | typecheck + production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc`, no emit |
| `npm run test` | Vitest (watch) |
| `npm run test:run` | Vitest once |
| `npm run test:coverage` | Vitest with coverage |
| `npm run coverage:check` | coverage ratchet gate |
| `npm run test:e2e` | Playwright (builds + previews first) |
| `AXE_ENFORCE=1 npm run test:e2e` | make the axe sweep merge-blocking |

## Roles

You act in one of eight roles, each backed by a specific Claude model.

### Router

| Task | Role | Model |
|---|---|---|
| Framing outcomes | strategist | Fable |
| Turning strategy into a spec | analyst | Fable |
| UX / IA / tone of voice | designer | Fable |
| Technical design, plan | architect | Opus |
| Implementing a plan task | builder | Sonnet |
| Failing tests, verification, behavioural review | tester | Opus |
| CHANGELOG / MEMORY / knowledge / release notes | documenter | Haiku |
| Merge, deploy, smoke, rollback | release-manager | Sonnet |

### Wear the hat, or dispatch?

**Dispatch a subagent** when the task holds a plan-task's worth of context,
when the role's model differs from your session's, or when you want
parallelism.

**Wear the hat yourself** for single-edit doc passes, two-line fixes, or any
interactive skill that dialogues with the human (`/brainstorming`,
`/writing-plans`). Spawning a subagent for a two-line CHANGELOG edit costs
more than doing it.

### Briefing a dispatched role

A dispatch is only as good as its brief, and a brief written from memory
repeats the author's mistakes. STU-925 spent 919k tokens across seven
dispatches; most of the avoidable cost was in the briefs, not the work.

- **One context file per ticket**, `docs/context/STU-NNN.md` — the approved
  design, the API contract agents code against, and the repo facts the work
  depends on. Briefs point at it instead of restating it. **Verify each repo
  fact before writing it down**: two STU-925 briefs asserted things about this
  repo that were false, and each cost the tester a correction.
- **Keep a Traps section in that file** and append to it the moment anything
  bites, so every later brief inherits it. STU-925's most expensive dispatch
  lost roughly a third of its tool calls to a trap already recorded in
  `knowledge/ERRORS.md` that nobody put in its brief.
- **Freeze the contract, then parallelise.** Once the API contract is written
  down, specs for stage N+1 can be written while stage N is implemented. Only
  serialise what actually depends on the previous output.
- **State assumptions as assumptions.** "Verify X; I believe it is Y" invites
  the correction that asserting Y as fact buries.
- **Do not optimise away mutation-verification.** A tester that proves its
  assertions bite — by building a throwaway implementation and deliberately
  breaking it — is the most expensive practice here and the highest-value one.
  It caught an assertion that would have failed a *correct* implementation.

See `knowledge/roles.md` for the full role definitions.

## The per-PR rhythm
1. A Linear ticket exists first (`STU-NNN`, Studio Manfred team, **Manfred Whiteboard**
   project) — file one if needed. The ticket exists before the branch.
2. Branch off `main`: `feat/STU-NNN-short-description`.
3. Write the failing test first (when the TDD trigger list applies).
4. Implement until green locally.
5. Update docs in the SAME PR (`CLAUDE.md` / `README.md` / `CHANGELOG.md` / `MEMORY.md` / `knowledge/ERRORS.md`).
   Changelog discipline: merge new entries into the **existing** `### Added/Changed/Fixed`
   heading under `[Unreleased]` — never prepend a new heading block (repeated prepends
   silently create duplicate headings).
6. Conventional commit naming the ticket: `feat(scope): summary (STU-NNN)`.
7. Open a PR with the template filled in, including `Closes STU-NNN`.
8. Wait for CI; iterate on red checks.
9. Squash-merge when green; the ticket auto-closes; pull `main`.

## Testing & TDD
- **Spec locations:** unit and component tests live in the top-level `test/` directory
  (45 files) and import from `src/lib/…`; `src/lib/utils.test.ts` is the lone exception.
  E2E tests live in `e2e/`.
- **Design-time ugly pass:** before implementing anything visual, ask what it looks
  like at its worst — text on the densest fill, the smallest element it can be drawn
  at, the narrowest viewport. Two of STU-925's three visual defects were answerable
  before a line was written.
- **The Iron Law:** no production logic without a failing test first.
- **TDD trigger list:** pure functions/helpers, data transforms, reducers, hooks with
  logic, bug fixes (write the regression test first), API/util modules. Trivial wiring and
  static markup are exempt.
- **Tactic:** extract a small helper and test that — don't try to test a 1000-line page.
- **Two regression-locking patterns:**
  - `test.fail()` / `it.fails()` ships a regression spec before the fix lands; the fix PR removes the marker.
  - warn-only-with-flag ratchet (axe via `AXE_ENFORCE`; `jsx-a11y` rules): each fix promotes one rule warn→error.
- **Visual verification for UI changes:** write a **throwaway Playwright spec** that drives
  the real preview build (`playwright.config.ts`'s `webServer` already builds + previews),
  screenshots the affected component, and gets eyeballed/shared — then delete the spec
  before committing. Cheap, real-render verification without polluting the suite. This is
  the sanctioned way to confirm a layout/visual change actually looks right.

## Accessibility (non-negotiable)
Semantic HTML first, ARIA only to fill gaps, full keyboard support. `jsx-a11y` + the axe
sweep guard it. Prefer the design system's accessible components over rolling your own.

## Governance guardrails — ASK before doing
- Destructive or irreversible actions (data deletion, migrations, force-push to shared branches).
- Anything outward-facing (publishing, sending, deploying to production).
- Deleting or overwriting files you did not create.
When in doubt, surface it and wait.

## Knowledge & memory
- At session close, append a dated entry to `MEMORY.md` (what shipped, decisions, next pickup).
- Log errors to `knowledge/ERRORS.md`; graduate recurring, cross-project truths **up** to
  the team base at `my-process/docs/knowledge/`.
- Review `knowledge/INDEX.md` at session start.
