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

## 2026-09-24 — pattern phase differed between canvas and export

- **Symptom:** a checkerboard fill appeared in one phase on screen and a different phase
  in the exported PNG — the same pattern at a different offset, up to ~8px.
- **Cause:** the canvas gives each shape its own `<svg>`, so `patternUnits="userSpaceOnUse"`
  tiled from the shape's local corner. The export shares one board-wide `viewBox`, so with
  no `x`/`y` on the `<pattern>` def it tiled from the board origin instead — the same
  coordinate system mismatch appears as a phase shift. The geometry source (`fill-patterns.ts`)
  was correct; the coordinate SPACE each renderer worked in was the surprise.
- **Fix / conclusion:** set `x`/`y` on the exported `<pattern>` to the element's position
  in board space. Lesson: when one geometry source feeds two renderers, the coordinate
  space each one works in is part of the contract, not an implementation detail. Spell it
  out in comments at the call sites.
- **Graduated to:** candidate for `my-process/docs/knowledge/` — will recur in any project
  that renders the same geometry to canvas and SVG.

---

## 2026-09-24 — structural tests passed while the feature was unusable

- **Symptom:** two rendering defects shipped green: (1) labels were swallowed by ~50%
  ink on checker and crosshatch patterns, making them unreadable; (2) the pattern picker
  chips drew a single tile (one dot for Ben-Day, two offset squares for a checkerboard),
  so you could not tell what you were choosing. All component tests passed.
- **Cause:** assertions only checked what was explicitly tested — containment, path
  distinctness, presence of absolute commands — and all of those were true in the broken
  state. A test can only verify what you thought to assert. Visual properties (readability,
  recognisability) lie outside structural assertions and require looking at the render.
- **Fix / conclusion:** screenshot the real render (Playwright driving the preview build)
  and eyeball it against the spec. For anything visual or spatial, a structural assertion
  is not enough. Lesson: jsdom tests cannot catch layout bugs, alignment issues, or anything
  that depends on how the render actually looks — that is the job of a real browser test,
  even a throwaway one that just captures a screenshot for human review.
- **Graduated to:** candidate for `my-process/docs/knowledge/` alongside the PointerEvent
  and Tailwind entries — together: "jsdom does not do rendering; test anything that needs
  to be seen in a real browser."

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

---

## 2026-09-23 — a Tailwind class that does not exist fails silently, and jsdom agrees

- **Symptom:** connectors and pen strokes could not be clicked, so they could not be
  selected or deleted. Their component tests passed.
- **Cause:** both hit areas used `className="pointer-events-stroke"`. **Tailwind has no
  such utility** — only `pointer-events-none` and `pointer-events-auto`. An unknown class
  generates no CSS and raises no error, so the path silently inherited
  `pointer-events: none` from its `<svg>` and never received a click.
- **Fix / conclusion:** `style={{ pointerEvents: 'stroke' }}`, which is a real SVG value.
  Two lessons worth keeping:
  1. **An invented Tailwind class is invisible.** Nothing fails; the element just does
     not behave. When a CSS-driven behaviour does not work, grep the *built* CSS for the
     class before debugging the logic: `grep -o "my-class" dist/assets/*.css`.
  2. **`fireEvent.click` proves nothing about clickability.** It dispatches straight at
     the node and never consults CSS hit-testing, so a component test happily "clicks" an
     element no user could reach. Anything whose behaviour depends on pointer-events,
     z-order or overlap needs an E2E test. Same family as the jsdom `PointerEvent` gap
     logged above.
- **Recurred 2026-09-23** (STU-869): `ConnectorLayer` passed
  `'filter drop-shadow(0 0 4px rgba(59,130,246,0.5))'` as a **className**, so the selected
  arrow's glow had never once rendered. Second instance of the same mistake in two weeks —
  a CSS value written where a utility class was expected. **Anything with parentheses or
  spaces in it is a style, not a class.**
- **Third instance 2026-09-23** (STU-871): resize handles rendered inside the canvas
  world container were unclickable, because that container sets `pointer-events: none` and
  the handles never re-enabled it for themselves. The click fell through to the canvas and
  started a marquee, which then cleared the selection — so a resize appeared to do nothing
  *and* deselected the element. Every jsdom test passed. **When adding controls to a layer,
  check what that layer does to pointer events.**
- **Graduated to:** candidate for `my-process/docs/knowledge/` alongside the
  PointerEvent entry — together they say "jsdom does not do layout, so test anything
  spatial in a real browser."

---

## 2026-09-23 — resize handles made connection anchors unclickable

- **Symptom:** after the resize feature shipped, clicking an element's connection anchor
  did nothing, so new arrows could not be drawn.
- **Cause:** two compounding faults. The edge resize handles straddle the element's edge,
  exactly where the anchors sat, and they appear the instant an element is selected — so
  pressing an anchor selected the element, spawned a handle under the pointer, and the
  mouseup landed on the handle instead. Separately, the anchor stopped propagation on
  `click` but not on `pointerdown`, so the press also reached the element beneath and was
  taken as the click that *completes* a connector.
- **Fix / conclusion:** move the anchors clear of the edge, and stop propagation on
  `pointerdown` as well as `click`. General lesson: a control that appears *as a result
  of* a press can swallow that same press — when adding affordances to a selected
  element, check what else already lives at those coordinates.
- **Graduated to:** not yet.


## 2026-09-25 — `vercel deploy --prod` returned "Not authorized" once, then succeeded

`vercel deploy --prod` (CLI 59.5.0) failed the first attempt with
`{"status":"error","reason":"deploy_failed","message":"Not authorized"}`, and
the same command succeeded on an immediate retry. Nothing was changed between
the two attempts — no re-auth, no token refresh, no settings touched.

**Logged without a conclusion.** This is an infrastructure error, and one
occurrence is not a pattern. If it recurs, the things to check first are
whether the CLI's cached credentials expire mid-session and whether the
GitHub integration's own auto-deploy (which had already fired 27s after the
merge) contends with an explicit CLI deploy for the same production alias.

Context: STU-953's release. Production ended up healthy and correctly aliased.
