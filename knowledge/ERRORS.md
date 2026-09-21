# Errors — manfred-whiteboard

Project-local error log.

- **Deterministic errors** (bad schema, wrong type, missing field) → conclude immediately,
  fix, link the conclusion into a category file.
- **Infrastructure errors** (timeout, rate limit, network) → log only; no conclusion until
  a pattern emerges.

Format:

```markdown
## YYYY-MM-DD — short title

- **Symptom:**
- **Cause:**
- **Fix / conclusion:**
- **Graduated to:** knowledge/<category> or my-process/docs/knowledge/ (when recurring)
```

---

## Seeded stack gotchas (ship with the starter — not incidents in this repo)

These were hit downstream (manfred-workshops, 2026-07-13) and will recur in any project
on this stack. Kept here so they are found *before* they cost debugging time again.

### TanStack Query v5 — `mutationFn` leaks a phantom 2nd argument

- **Symptom:** `expect(spy).toHaveBeenCalledWith(id)` fails — the spy received a second,
  unexpected object argument; APIs with an optional 2nd parameter can misbehave.
- **Cause:** v5 calls `mutationFn(variables, context)`. Passing a single-arg API function
  directly (`mutationFn: api.deleteThing`) forwards the context object as argument 2.
- **Fix / conclusion:** always wrap: `mutationFn: (id) => api.deleteThing(id)`.

### PGlite + parallel Vitest — intermittent hook timeouts in full runs

- **Symptom:** db test files all pass in isolation, but full runs intermittently blow the
  15s hook timeout.
- **Cause:** many Vitest workers each booting their own PGlite instance contend on startup.
- **Fix / conclusion:** if a PGlite test harness lands in this repo, mitigate up front:
  cap workers/pool for db suites, raise `hookTimeout`, or share a template database.

---

## 2026-09-21 — multiplayer silently never connected (relay port drift)

- **Symptom:** two tabs on the same room each showed their own board. No console error,
  no failed request in sight — each tab just looked like it was working alone.
- **Cause:** `src/lib/yjs-provider.ts` defaulted to `ws://localhost:1234` while
  `server/ws-server.mjs` listens on `4444`. `WebsocketProvider` retries in the
  background without throwing, and `y-indexeddb` kept each tab's own copy alive, so the
  failure looked like a working local-only board.
- **Fix / conclusion:** default the client to the relay's port, allow `VITE_WS_URL` to
  override, and cross-reference the two files in comments. The general lesson: when a
  client endpoint and its server live in the same repo, a **multi-process E2E test is
  the only thing that catches drift** — no unit test, type or lint rule can. The
  multi-tab Playwright spec now boots the relay via `webServer` and fails if sync
  breaks.
- **Graduated to:** not yet — watch for a second instance of "silently degrades to
  local-only" before promoting to `my-process/docs/knowledge/`.

