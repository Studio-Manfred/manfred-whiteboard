# Gotchas

Recurring traps that have bitten more than one project. Each entry was graduated
from a per-project `knowledge/ERRORS.md` after appearing in at least two repos.

---

## Tailwind v4 is not v3

**Symptom:** `tailwind.config.js`, `@tailwind base/components/utilities` directives, or
`theme.extend` don't work after upgrading or scaffolding a new project with v4.
**Cause:** Tailwind v4 changed the model entirely. The old config file and directives
are not recognised.
**Fix:** Use a single `@import 'tailwindcss';` in the CSS entry point; add the
`@tailwindcss/vite` plugin; no `tailwind.config.js` by default. Define tokens and theme
overrides via CSS `@theme` blocks.

---

## Design-system install fails (401 local/Vercel, 403 CI)

Every new repo consuming `@studio-manfred/manfred-design-system` hits these in
sequence — treat them as a setup checklist, not incidents. Three surfaces, three fixes:

**Local — 401 from `npm.pkg.github.com`.**
`GITHUB_TOKEN` is missing, lacks `read:packages` scope, or has expired (a rotated
leaked/shared PAT also triggers this). Supply a token with `read:packages`:
```bash
export GITHUB_TOKEN=$(gh auth token)
```
The `.npmrc` (or `.pnpmrc`) must carry the `@studio-manfred:registry` line pointing at
`npm.pkg.github.com` with `${GITHUB_TOKEN}` interpolated.

**GitHub Actions — first `npm ci` fails `403 permission_denied: read_package`.**
The workflow's built-in `GITHUB_TOKEN` can only read the private package if the package
grants the repo access. Fix is UI-only, no API: Studio-Manfred org → Packages →
`manfred-design-system` → Package settings → **Manage Actions access** → add the repo
with **read** role.

**Vercel — every build fails `npm install` with `401 Unauthorized`.**
Vercel has no GitHub token at all. Add a `GITHUB_TOKEN` env var (PAT scoped to
**read:packages** only) in all three environments:
```bash
vercel env add GITHUB_TOKEN production   # repeat for preview + development
```

The bootstrap script prints the CI and Vercel steps in its "Next steps" output; the
canonical walkthrough lives in `docs/stack-and-conventions.md` → Design System
connection.

**Seen in:** manfred-crm (2026-05-11, STU-related), manfred-analytics (CI 403),
manfred-workshops PR #1 (2026-07-09/10, both CI 403 and Vercel 401 — STU-645).

---

## Vite bakes `VITE_*` env vars at build time

**Symptom:** Setting a `VITE_` variable at preview/runtime (e.g. in Playwright's
`webServer.env`) has no effect — the app still uses the value that was current at build.
**Cause:** `import.meta.env.VITE_*` reads are inlined into the bundle at **build** time.
Runtime injection is too late.
**Fix:** Don't rely on runtime override. In E2E, intercept at the network layer:
`page.route()` to redirect the baked URL to the test target. Or rebuild with the desired
value. See also: Playwright `route.continue({ url })` cross-origin trap below.

**Seen in:** manfred-intranet (2026-05-16, STU-320).

---

## Playwright `route.continue({ url })` silently hangs on cross-origin redirects

**Symptom:** Attempting to redirect a request to a different origin via
`route.continue({ url: target })` — the request hangs; network log shows `REQ:` but no
`RES:`.
**Cause:** Playwright's `route.continue({ url })` only allows same-origin URL changes.
Cross-origin changes stall silently without an error.
**Fix:** Use the fetch-then-fulfill pattern:
```ts
const response = await route.fetch({ url: target });
await route.fulfill({ response });
```
Wrap in a try/catch — if the page closes mid-request the `fulfill` call throws
"Target page has been closed"; swallow that case.

**Seen in:** manfred-intranet (2026-05-16, STU-320).

---

## happy-dom ships a partial `localStorage`

**Symptom:** `TypeError: localStorage.clear is not a function` (or `removeItem`, etc.)
in tests running under happy-dom.
**Cause:** happy-dom 15.x has an incomplete Storage implementation — the object exists
but several methods are missing or not real functions.
**Fix:** Prefer `jsdom` for the unit environment (the starter template uses jsdom by
default). If staying on happy-dom, add a Map-backed `Storage` shim in `test/setup.ts`.

**Seen in:** manfred-intranet (2026-05-16, STU-319).

---

## react-hooks 7.x compiler rules surface as lint failures

**Symptom:** Many new ESLint errors after upgrading `eslint-plugin-react-hooks` to 7.x.
**Cause:** The compiler-aware rules are stricter than 6.x; previously passing code is
now flagged.
**Fix:** Use the warn→error ratchet — demote new failures to `warn`, fix incrementally,
promote back to `error` as each is resolved. Don't bulk-disable.

---

## CSV row counts via naive `\n` split are wrong

**Symptom:** Row count from a quick `split('\n').length` is inflated compared with the
actual number of records.
**Cause:** Quoted cells can contain literal newlines (RFC-4180). A naive line split
treats each embedded newline as a new row.
**Fix:** Always count (and parse) CSV rows with a quote-aware RFC-4180 parser, not a
line split.

**Seen in:** manfred-crm (2026-05-11 — 578 became 344, STU-142/143).

---

## JSX in `vi.mock()` factories needs the automatic JSX runtime

**Symptom:** `ReferenceError: React is not defined` inside a `vi.mock` factory that
contains JSX.
**Cause:** Vitest passes mock factories through esbuild. Without `jsx: 'automatic'`, the
classic transform compiles `<div>` to `React.createElement(...)`, which requires React in
scope — but there is no implicit import.
**Fix:** Add `esbuild: { jsx: 'automatic' }` to the top level of `vitest.config.ts`.

**Seen in:** manfred-intranet (2026-05-16, STU-319).

---

## Piping typecheck output through `tail`/`head` swallows exit code

**Symptom:** `pnpm typecheck 2>&1 | tail -5 && git commit ...` proceeds to commit even
when TypeScript reports errors.
**Cause:** In a shell pipeline the exit code is the last command's (`tail`), not tsc's.
`tail` exits 0 whenever it receives input.
**Fix:** Never pipe the verification step. Use `pnpm typecheck && git commit ...`
directly, or add `set -o pipefail` at the top of the script.

**Seen in:** manfred-crm (2026-05-11).

---

## Supabase JS client silently caps query results at 1000 rows

**Symptom:** Dashboard queries return data only for the oldest N records; recent records
appear missing even though they exist in the database.
**Cause:** Two layers. (1) The Supabase JS client defaults to `Range: 0-999` when no
`.limit()` is set. (2) Supabase's Data API "Max rows" server setting defaults to 1000
and silently truncates any larger `.limit()`.
**Fix:** Set an explicit `.limit(N)` in code and bump "Max rows" in the Supabase
dashboard (Data API → Settings). Long-term fix: move aggregation server-side via a
Postgres RPC so the dashboard returns O(endpoints) rows, not O(checks).

**Seen in:** manfred-up (2026-05-27, STU-472).

---

## Turbopack watches `~/` when a stray `package-lock.json` sits in `$HOME`

**Symptom:** `npm run dev` / `pnpm dev` pegs CPU or freezes the machine; Turbopack
watches the entire home directory.
**Cause:** Next.js infers workspace root from the nearest `package.json`/`package-lock.json`.
A stray lockfile in an ancestor (e.g. `~/package-lock.json`) makes it treat `$HOME` as
the workspace root.
**Fix:** Remove the stray lockfile. Pin `turbopack.root` and `outputFileTracingRoot` in
`next.config.ts` to prevent recurrence.

**Seen in:** manfred-analytics.
