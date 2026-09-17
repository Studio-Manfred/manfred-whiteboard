# Procedural Knowledge

Cross-repo how-tos. Follow these consistently; deviations need a documented reason.

---

## Deploy to Vercel

1. Open a PR from a feature branch — Vercel auto-creates a preview deployment.
2. Verify the preview (smoke test, check env vars are correct).
3. CI must be green (lint, typecheck, unit tests, E2E, axe).
4. Squash-merge to `main` — Vercel promotes the build to production automatically.
5. No manual `vercel --prod` deploys unless CI is bypassed for a documented hotfix.

---

## Linear Write-Discipline

- **Ticket before branch.** Create the Linear ticket first; branch off it.
  Branch name: `feat/STU-NNN-short-description`.
- **Keep descriptions accurate.** Update the ticket description when scope changes —
  stale descriptions mislead the next person.
- **Auto-close via PR body.** Include `Closes STU-NNN` in the PR description so the
  ticket closes on merge.
- **Conventional commits naming the ticket:**
  `feat(scope): summary (STU-NNN)` or `fix(scope): summary (STU-NNN)`.

---

## The Ratchets

Three progressive-enforcement patterns used across all projects:

### Lint / a11y ratchet (warn → error)

Rules are introduced as `warn`, then promoted to `error` incrementally as violations
are fixed. Never bulk-disable a new rule and never regress an already-promoted rule.

For axe (accessibility E2E): gate behind `AXE_ENFORCE=1` locally and in CI when the
sweep is meant to be merge-blocking. Default is warn-only so it does not block PRs
prematurely.

### Regression-lock patterns

- `test.fail()` / `it.fails()`: ships a failing spec before the fix lands. The fix PR
  removes the marker. Documents intent and prevents silent regression once fixed.
- Use for bugs that have a clear repro and a known fix coming in a separate PR.

### Monotonic coverage ratchet

- Coverage baseline stored in `.coverage-baseline.json` at project root.
- `scripts/coverage-ratchet.mjs` compares current coverage against the baseline and
  fails if any metric drops.
- Run with `npm run coverage:check` (available in all starter-template projects).
- To raise the baseline intentionally: update `.coverage-baseline.json` in the same PR
  that adds the coverage-increasing tests.

---

## Release and Changelog Flow

- Use [Keep a Changelog](https://keepachangelog.com/) format in `CHANGELOG.md`.
- Conventional commits drive the changelog entries:
  - `feat:` → Added
  - `fix:` → Fixed
  - `refactor:` / `perf:` → Changed
  - `docs:` → no changelog entry (or a brief note)
  - Breaking changes (`!` or `BREAKING CHANGE:` footer) → noted under each section.
- On release: move `[Unreleased]` entries to a versioned section, tag the commit with
  the version, push tag.
- No automated release tooling is mandated; the flow is manual and deliberate.

---

## Per-PR Rhythm (short form)

1. Ticket exists in Linear.
2. Branch: `feat/STU-NNN-short-description`.
3. Write the failing test first (TDD trigger list applies — see project AGENTS.md).
4. Implement until green locally.
5. Update docs in the same PR (`CLAUDE.md`, `README.md`, `MEMORY.md`,
   `knowledge/ERRORS.md`).
6. Conventional commit naming the ticket.
7. Open PR with template filled in, including `Closes STU-NNN`.
8. Wait for CI; iterate on red checks.
9. Squash-merge when green; pull `main`.
