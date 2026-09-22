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

---

## 2026-09-21 — jsdom has no PointerEvent, so pointer coordinates arrive as NaN

- **Symptom:** a component test firing `fireEvent.pointerDown(el, { clientX: 300,
  clientY: 150 })` saw the handler receive `{ x: NaN, y: NaN }`.
- **Cause:** jsdom does not implement `PointerEvent`. Testing Library falls back to a
  plain `Event`, which carries no `clientX`/`clientY`, so the coordinates are silently
  dropped rather than erroring.
- **Fix / conclusion:** polyfill `PointerEvent` as a subclass of `MouseEvent` in
  `test/setup.ts`. The wider trap: tests that only assert "the handler was called" pass
  happily under this bug — assert on the *values* a pointer handler receives, or the
  test proves nothing about position.
- **Graduated to:** candidate for `my-process/docs/knowledge/` — this will recur in any
  project on this stack that tests pointer interactions.

---

## 2026-09-21 — coverage ratchet failed on a baseline the repo had outgrown

- **Symptom:** `npm run coverage:check` failed at 22.5% statements against a 52.17%
  baseline, with no single change responsible.
- **Cause:** the baseline was recorded when the repo was almost all `lib` code. A large
  batch of view code then landed untested, and because the coverage config includes all
  of `src/**` whether imported or not, the percentage fell even though nothing regressed.
- **Fix / conclusion:** the answer was not to lower the gate. Extracting logic out of the
  page into `lib/` helpers and covering the component layer took statements to 97.73%,
  and the baseline was then raised. A ratchet measured as a *percentage* drifts whenever
  the shape of the codebase changes — treat a sudden drop as a question about what
  landed untested, not as a broken gate.
- **Graduated to:** not yet.

---

## 2026-09-22 — a new repo cannot install the private design-system package

- **Symptom:** the first CI run on a brand-new repo failed at `npm ci` with
  `403 permission_denied: read_package` for `@studio-manfred/manfred-design-system`;
  the first Vercel build failed the same way with `401 unauthenticated`.
- **Cause:** two separate gates, easily mistaken for one. GitHub Actions authenticates
  with the built-in `GITHUB_TOKEN`, which only reaches an org package once that package
  grants the repository read access. Vercel is not GitHub Actions and has no such token
  at all — it needs `GITHUB_TOKEN` in its own environment, **per environment**: a
  Production variable does not cover a preview build.
- **Fix / conclusion:** grant the repo access on the package (UI only — there is no REST
  endpoint for npm package access grants, so a `read:packages` token cannot do it), and
  add the Vercel variable per environment from the CLI. Worth asking early whether the
  dependency is used at all: here it was declared but imported by no file, and an unused
  private dependency turns a public repo into one outsiders cannot build.
- **Graduated to:** candidate for `my-process/docs/knowledge/` — every new project from
  the starter will hit both gates.

