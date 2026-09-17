# Stack and conventions

The canonical starter is a frontend-only Vite SPA. This document covers the stack choices and why they were made, followed by branching, commit, and file-naming conventions.

For the full ways-of-working context see [ways-of-working.md](./ways-of-working.md).

---

## The stack

### Framework: React 19 + Vite + TypeScript

React 19 + Vite gives a fast dev loop, straightforward mental model, and no framework-specific build magic to debug. This is a SPA — no Server Components, no route handlers, no file-based routing. If a project needs SSR or server functions, pick a different starter (e.g. Next.js); the way of working is portable, the stack is not.

TypeScript is used throughout. The tsconfig in `../starter/tsconfig.app.json` is strict.

### Styling: Tailwind v4

Tailwind v4 uses a CSS-first configuration (`@theme` in CSS, not a `tailwind.config.js`). The Vite plugin (`@tailwindcss/vite`) handles PostCSS. Do not mix v3 patterns with v4 — the config model is different.

One gotcha: **universal resets must live inside `@layer base`**. Tailwind v4 puts utilities in `@layer utilities`. Un-layered CSS beats layered CSS regardless of specificity, so keep resets layered to avoid surprise overrides.

### Component library: shadcn/Radix + Manfred Design System

shadcn/ui components are installed into `src/components/ui/` and owned by the project. Radix primitives provide accessible headless components underneath.

The Manfred Design System (`@studio-manfred/manfred-design-system`) is the shared layer for brand-consistent components across projects. It is a private GitHub Packages package — see the Design System Connection section below.

Prefer design system components over rolling your own. The accessible behaviour is already built in.

### Testing: Vitest + Playwright + axe

- **Vitest** for unit and integration tests. Config at `../starter/vitest.config.ts`.
- **`@testing-library/react`** for component tests. Setup at `../starter/test/setup.ts`.
- **Playwright** for E2E. Config at `../starter/playwright.config.ts`. Two browser projects: Chromium-desktop and Chromium-mobile (Pixel 5).
- **`@axe-core/playwright`** for accessibility sweeps in E2E. Warn-only by default; `AXE_ENFORCE=1` flips it merge-blocking.
- **`eslint-plugin-jsx-a11y`** for accessibility at edit time. Config at `../starter/eslint.config.js`.

### Coverage ratchet

`../starter/scripts/coverage-ratchet.mjs` reads `../starter/.coverage-baseline.json` and fails the CI build if coverage drops more than 0.5% below baseline. After each PR that adds tests, update the baseline. Coverage can only go up.

### Linting: ESLint 9 flat config

`../starter/eslint.config.js` uses ESLint's flat config format (no `.eslintrc`). Plugins:

- `@eslint/js` — core rules
- `typescript-eslint` — TypeScript-aware rules
- `eslint-plugin-react-hooks` — enforces rules of hooks
- `eslint-plugin-react-refresh` — catches HMR edge cases
- `eslint-plugin-jsx-a11y` — accessibility rules at edit time (several set to `error` out of the box)

### Hosting: Vercel

`../starter/vercel.json` rewrites all routes to `/index.html` for client-side routing. Every PR gets a preview deploy. Squash-merge to `main` triggers a production deploy automatically.

---

## Design System connection

The design system is a private GitHub Packages package. It requires a GitHub token with `read:packages` scope to install.

### `.npmrc` setup

`../starter/.npmrc` contains:

```
@studio-manfred:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

The `GITHUB_TOKEN` variable is resolved at install time from the environment. For local development, set it in your shell profile or a `.env` file (never commit the token). For CI, add it as a repository secret and pass it in the `env:` block of your install step.

### One-time local token setup

```bash
export GITHUB_TOKEN=ghp_your_token_here
npm install
```

Or add the export to your `~/.zshrc` / `~/.bashrc` so it is available in every session.

### New-repo access checklist (CI + Vercel)

Every new repo that consumes the design system hits two access failures on its first CI run and first Vercel deploy unless these are done up front (both bitten on manfred-workshops PR #1, 2026-07-09/10):

1. **GitHub Actions — grant the repo read access to the package.** The workflow's built-in `GITHUB_TOKEN` can only read the private package if the package explicitly grants the repo access. Until then, `npm ci` fails with `403 permission_denied: read_package`. Fix is UI-only, no API: Studio-Manfred org → Packages → `manfred-design-system` → Package settings → **Manage Actions access** → add the new repo with **read** role.
2. **Vercel — provide a `GITHUB_TOKEN` env var.** Vercel builds have no GitHub token at all, so every build fails `npm install` with `401 Unauthorized`. Create a PAT scoped to **read:packages** only and add it to all three environments:

   ```bash
   vercel env add GITHUB_TOKEN production
   vercel env add GITHUB_TOKEN preview
   vercel env add GITHUB_TOKEN development
   ```

The bootstrap script prints both steps in its "Next steps" output; this section is the canonical reference. See also [knowledge/gotchas.md](./knowledge/gotchas.md).

### Importing the design system

Import the styles once at the app root — in `src/index.css`:

```css
@import 'tailwindcss';
@import '@studio-manfred/manfred-design-system/styles';
```

Import components via named imports:

```tsx
import { Button, Card } from '@studio-manfred/manfred-design-system'
```

Do not import the entire package with a default import. Named imports enable tree-shaking.

### Storybook and MCP server

The design system ships a live Storybook for browsing components and an MCP server for querying component APIs from Claude Code. Use it to understand what is available before building a custom component.

Two MCP endpoints — **prefer local, fall back to the published one:**

- **Local** (`http://localhost:6006/mcp`) — full toolset; only available when the design-system repo's Storybook is running (`npm run storybook` in that checkout).
- **Published** (`https://main--6a26cfd37771192ff26832bf.chromatic.com/mcp`) — Chromatic-hosted, public, always current with `main`; **docs toolset only** (`list-all-documentation`, `get-documentation`, `get-documentation-for-story`). Use this when you don't have the DS Storybook running — the common case when you're only *consuming* the package.

For visual browsing, the public Storybook is at <https://studio-manfred.github.io/manfred-design-system/>.

---

## Branching conventions

- Branch off `main` always: `git checkout -b feat/{{LINEAR_PREFIX}}-NNN-short-desc`
- Branch prefixes: `feat/` for features, `fix/` for bug fixes, `chore/` for maintenance, `docs/` for docs-only changes.
- Keep branch names lowercase and hyphenated.
- Include the Linear ticket ID in the branch name — it is the join key.
- Never force-push to `main`. Force-push to feature branches is fine.

---

## Conventional commits

Format: `type(scope): summary ({{LINEAR_PREFIX}}-NNN)`

| Type | When to use |
|---|---|
| `feat` | New feature or user-visible behaviour |
| `fix` | Bug fix |
| `chore` | Build, tooling, dependency update |
| `docs` | Documentation only |
| `test` | Test-only change |
| `refactor` | No behaviour change |
| `style` | Formatting, whitespace, no logic change |
| `perf` | Performance improvement |

Because we squash-merge, the PR title is the permanent commit subject on `main`. Make it meaningful and conventional-commit shaped.

Examples:

```
feat(search): keyboard navigation in global search panel ({{LINEAR_PREFIX}}-501)
fix(auth): redirect loop on token expiry ({{LINEAR_PREFIX}}-502)
chore: update vitest to 3.2.6 ({{LINEAR_PREFIX}}-503)
```

---

## File-naming conventions

Match the convention of the directory you are in:

| Thing | Convention | Example |
|---|---|---|
| Page components | PascalCase `.tsx` | `Dashboard.tsx`, `CardDetail.tsx` |
| UI primitives | kebab-case `.tsx` | `page-title.tsx`, `error-boundary.tsx` |
| Pure logic helpers | kebab-case `.ts` in `src/lib/` | `search-keyboard-nav.ts`, `format-date.ts` |
| Hooks | camelCase `.ts` in `src/hooks/` | `useSearchState.ts` |
| Test files | co-located, same name + `.test.tsx` | `Greeting.test.tsx`, `utils.test.ts` |
| E2E specs | kebab-case `.spec.ts` in `e2e/` | `search-keyboard-nav.spec.ts` |
| Scripts | kebab-case `.mjs` | `coverage-ratchet.mjs` |

The AI matches the surrounding code's idiom. If a file already uses PascalCase, continue PascalCase. Do not mix conventions in a directory.
