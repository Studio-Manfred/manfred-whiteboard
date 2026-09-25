# Knowledge Index — manfred-whiteboard

Progressive disclosure: read top-down, load only what you need. This is the per-project
flywheel. When a fact turns out to recur across projects, graduate it **up** into the team
base at `my-process/docs/knowledge/`.

## Categories

### Domain
<!-- What things are: product context, APIs, naming, team decisions. -->
- [ui-patterns.md](ui-patterns.md) — seeded UI construction patterns (clickable cards, card footers with actions, DS icon-gap stopgap).
- [docs/bootstrap/knowledge/domain.md](../docs/bootstrap/knowledge/domain.md) — Studio Manfred team domain principles and design conventions.
- [docs/bootstrap/knowledge/gotchas.md](../docs/bootstrap/knowledge/gotchas.md) — Team gotchas, common traps, and mitigations.

### Procedural
<!-- How to do things: deploy steps, test commands, review flows. -->
- [docs/bootstrap/ways-of-working.md](../docs/bootstrap/ways-of-working.md) — Full Manfred development rhythm, TDD rules, code reviews, PR templates.
- [docs/bootstrap/stack-and-conventions.md](../docs/bootstrap/stack-and-conventions.md) — Stack conventions (Vite, React 19, TypeScript, Tailwind 4, Vitest, Playwright, Vercel).
- [docs/bootstrap/superpowers-workflow.md](../docs/bootstrap/superpowers-workflow.md) — Superpowers workflow (brainstorming, writing-plans, TDD, subagents).
- [docs/bootstrap/knowledge/procedural.md](../docs/bootstrap/knowledge/procedural.md) — Deploy steps, package tokens, CI/CD access.
- [subagent-review.md](subagent-review.md) — what STU-953 taught about running a plan
  through subagents: why a plan is a hypothesis, how to tell a guard from decoration, and
  the bug classes jsdom cannot see.

### Audit & status
<!-- Read-only audits, prioritised findings, remediation order. -->

### Reference
<!-- Pointers to external sources of truth. -->
- Linear project **Manfred Whiteboard** (team `STU`) —
  https://linear.app/studio-manfred/project/manfred-whiteboard-a2565bc4d491
- Repo: https://github.com/Studio-Manfred/manfred-whiteboard · Production:
  https://manfred-whiteboard.vercel.app

### Plans & Specs
<!-- Decomposition plans for larger pieces of work. -->
- [docs/superpowers/specs/2026-09-17-collaborative-whiteboard-design.md](../docs/superpowers/specs/2026-09-17-collaborative-whiteboard-design.md) — Collaborative Whiteboard Design Spec.

## Maintenance rules
- Review at session start; merge overlaps; split files that grow too long.
- Remove inaccurate knowledge. Create categories when patterns emerge.
- `ERRORS.md` is the error log (see its header for the format).

