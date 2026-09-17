# Superpowers workflow

The "superpowers" skills are a set of named slash-commands that encode the way of working as executable steps. Each skill has a clear input, a clear output, and a place to save that output. This document lists them in the order they are used in a typical feature, what each produces, and where it goes.

For the full per-feature rhythm see [ways-of-working.md](./ways-of-working.md#15-the-per-feature-rhythm).

---

## The chain

### 1. `/brainstorming` — hard gate before any code

**Trigger:** any creative, design, or non-mechanical task.

**What it does:**

1. Reads the relevant files, recent commits, and existing patterns before asking anything.
2. Asks one question at a time (multiple-choice where possible) to narrow the idea.
3. Produces two or three approaches with trade-offs and a recommendation.
4. Presents the design in sections, each approved before moving on.
5. Refuses to produce implementation code until the design is approved.

**Output:** a spec file saved at `docs/superpowers/specs/YYYY-MM-DD-feature-name.md`.

The spec is committed to the repo so it outlives the chat session and can be linked from the Linear ticket.

---

### 2. `/writing-plans` — ordered implementation plan

**Trigger:** approved spec from brainstorming (or a mechanical task with a clear scope).

**What it does:**

1. Reads the spec, the codebase, and any relevant knowledge files.
2. Produces an ordered list of implementation steps with: files to touch, step sequence, risks, and decomposition into tasks sized for TDD (one behaviour per task).
3. Flags which tasks are independent (can run in parallel) and which must be sequential.

**Output:** a plan file saved at `docs/superpowers/plans/YYYY-MM-DD-feature-name.md`.

**Bite-sized TDD tasks:** each task in the plan names exactly one behaviour to test and one function or module to implement. A plan with 20 large tasks is too coarse; break it down until each task is one Red → Green → Refactor cycle.

---

### 3. Executing the plan — two modes

#### `/executing-plans` — single-agent sequential

Use when tasks are interdependent or the plan is short. The agent works through the plan top to bottom: one failing test, one green implementation, one refactor pass, then on to the next task.

#### `/subagent-driven-development` — fresh subagent per task

Use when tasks are independent and parallelism is safe. Each task spawns a fresh subagent with:

- The spec
- The plan task description
- Read access to the codebase
- Write access only to the files it needs

**Two-stage review before merging each task's output:**

1. **Spec compliance** — does the implementation match what the spec approved?
2. **Code quality** — correct, simple, readable, follows project conventions?

Both stages must pass before the task output is accepted. The orchestrator (not the subagents) decides what to keep.

---

### 4. `/dispatching-parallel-agents` — fan-out for coverage

Use when you have N independent tasks (e.g. writing tests for N existing functions, auditing N files, exploring N directories).

**Pattern:**
- Dispatch N agents with non-overlapping file access.
- Each returns a structured result (data, not prose).
- One judge agent (or the orchestrator) aggregates and resolves conflicts.

**Governance:** subagents do not write `MEMORY.md`, docs, or knowledge files. They return data; the orchestrator writes the conclusions.

**Many agents, one judge:** for security reviews, accessibility audits, or any task where false positives are expensive, add a second pass of skeptic agents that try to refute each finding before it is reported. Only findings that survive get acted on.

---

### 5. `/test-driven-development` — the Iron Law in practice

See [ways-of-working.md section 5](./ways-of-working.md#5-test-driven-development--the-core-discipline) for the full detail.

The skill enforces:

- Write the failing test first. Run it. Confirm it fails for the right reason.
- Implement the minimum code to pass. Nothing more.
- Refactor while staying green.
- Do not proceed to the next task until the current one is green.

---

### 6. `/systematic-debugging` — structured diagnosis

Use when a test is failing and the cause is not obvious.

**Pattern:**

1. Reproduce the failure deterministically (command that always fails).
2. Form one hypothesis. Test it. Record the result.
3. Narrow to the smallest reproducible case.
4. Fix the root cause, not a symptom.
5. Write a regression test if one does not already exist.

Do not scatter `console.log` statements across the codebase. Diagnose, fix, remove debug output.

---

### 7. `/verification-before-completion` — confirm before calling it done

Before marking a task complete:

1. Run the test suite (`npm run test:run`).
2. Run the type checker (`npm run typecheck`).
3. Run the linter (`npm run lint`).
4. Run the coverage ratchet (`npm run coverage:check`).
5. Build (`npm run build`).
6. For UI changes: run E2E (`npm run test:e2e`).

All must pass. If any fail, fix before closing the task.

---

### 8. `/requesting-code-review` and `/receiving-code-review`

**Requesting:** opens a PR with the template filled in (Summary, Why, Test plan, Tests added, Coverage, Linked issues), including `Closes {{LINEAR_PREFIX}}-NNN`, and confirms CI triggered.

**Receiving:** processes reviewer feedback systematically:

1. Acknowledge each comment.
2. For agreed changes: implement, add a test if the change is behavioural, force-push to the feature branch, and reply with a link to the commit.
3. For disagreed changes: explain the reasoning and ask for clarification rather than silently ignoring.

---

### 9. `/finishing-a-development-branch` — close the loop

After CI is green and the PR is approved:

1. Squash-merge — the PR title becomes the permanent commit subject on `main`.
2. Pull `main` locally.
3. Verify the Linear ticket auto-closed (check; ask before flipping manually if it did not).
4. Update `MEMORY.md` with what shipped and any decisions made.
5. Update `CHANGELOG.md`.
6. Graduate any new gotchas or patterns to `knowledge/ERRORS.md` or the relevant `knowledge/` doc.
7. Delete the feature branch locally and on the remote.

---

## Linear mapping

The superpowers plan structure maps directly to Linear:

| Plan level | Linear artifact |
|---|---|
| Plan phases (major groupings) | Milestones |
| Independent task groups | Epics (umbrella tickets) |
| Individual tasks | `{{LINEAR_PREFIX}}-NNN` tickets |
| A single PR's work | One child ticket |

**`{{LINEAR_PREFIX}}-NNN` is the join key** between the plan, the code, the PR, and the tracker. Every failing test description, every branch name, every commit title, and every PR body contains it. One search finds everything.

`Closes {{LINEAR_PREFIX}}-NNN` in the PR body auto-closes the ticket on squash-merge. No manual status change needed.

---

## Loop close — knowledge and memory updates

Every session ends with the loop close. Do not skip it.

- Append a dated entry to `MEMORY.md` (what shipped, decisions made, where to pick up next session).
- Log any errors or gotchas encountered to `knowledge/ERRORS.md`.
- If a learning is reusable across projects, graduate it up to `docs/knowledge/`.
- If a learning invalidates something already in a knowledge file, update or delete that entry.

The knowledge base compounds. The AI gets more useful on this project specifically because the learnings are in the files it reads.
