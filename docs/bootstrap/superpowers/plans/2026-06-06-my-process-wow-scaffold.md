# my-process — WoW docs + scaffold + bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the empty `my-process` repo into a GitHub template that holds generalized ways-of-working docs, a compounded cross-repo knowledge base, a runnable Vite SPA starter with the WoW baked in, a manifest-driven portable overlay, and a dependency-free `bootstrap.mjs` with optional GitHub/Linear/Vercel provisioning.

**Architecture:** Three concerns kept separate — `docs/` (knowledge, human-read), `starter/` (the single canonical source of files, machine-copied), and `scripts/bootstrap.mjs` (the distribution tool). The "overlay" is not a folder but `overlay.manifest.json` naming a subset of `starter/`. The bootstrap copies files + swaps three placeholders, then optionally provisions external resources behind injectable, unit-tested pure builders.

**Tech Stack:** Node 22 (ESM, zero runtime deps for the script). Starter: React 19 + TypeScript + Vite + Tailwind v4 (`@tailwindcss/vite`) + shadcn/Radix + `@studio-manfred/manfred-design-system@^0.22.0`. Tests: Vitest + Testing Library + jsdom; Playwright + `@axe-core/playwright`; ESLint flat config + `eslint-plugin-jsx-a11y`. CI: GitHub Actions. Hosting: Vercel.

**Reference spec:** [docs/superpowers/specs/2026-06-06-my-process-wow-scaffold-design.md](../specs/2026-06-06-my-process-wow-scaffold-design.md)

**Working directory:** All paths are relative to the repo root `/Users/jens.wedin/Sandbox/Code/my-process`. The repo is already `git init`'d on `main` with the spec committed. Execute in a worktree if using subagent-driven-development.

**Conventions for every task:** Conventional-commit messages; end each commit body with the `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` trailer. Never write to any sibling repo under `Code/` — this plan only touches `my-process/`.

---

## Phase A — Repo skeleton & metadata

### Task A1: Top-level meta files

**Files:**
- Create: `LICENSE`
- Create: `CHANGELOG.md`
- Create: `.editorconfig`

- [ ] **Step 1: Create `LICENSE`** (MIT, Studio Manfred)

```
MIT License

Copyright (c) 2026 Studio Manfred

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Create `CHANGELOG.md`** (Keep a Changelog format)

```markdown
# Changelog

All notable changes to this template are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this repo is
versioned like a product.

## [Unreleased]

### Added
- Initial template: ways-of-working docs, compounded knowledge base, runnable
  Vite SPA starter with the WoW baked in, portable overlay manifest, and a
  dependency-free bootstrap script with optional GitHub/Linear/Vercel
  provisioning.
```

- [ ] **Step 3: Create `.editorconfig`**

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

- [ ] **Step 4: Commit**

```bash
git add LICENSE CHANGELOG.md .editorconfig
git commit -m "chore: add license, changelog, editorconfig"
```

---

## Phase B — Runnable Vite SPA starter (green: lint, typecheck, unit, coverage)

> The starter lives entirely under `starter/`. It is its own npm project. The acceptance bar for this phase: from a clean `starter/`, `npm install` (with `GITHUB_TOKEN` set), then `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run test:coverage`, `npm run coverage:check`, and `npm run build` all pass.

### Task B1: Scaffold the Vite React-TS app and prune

**Files:**
- Create: `starter/` (via Vite scaffolder), then prune defaults.

- [ ] **Step 1: Scaffold into `starter/`**

Run from repo root:
```bash
npm create vite@latest starter -- --template react-ts
```
Expected: `starter/` created with `package.json`, `index.html`, `src/`, `tsconfig*.json`, `vite.config.ts`.

- [ ] **Step 2: Remove the demo cruft we will replace**

```bash
cd starter
rm -f src/App.css src/assets/react.svg public/vite.svg
cd ..
```
Expected: those files gone; `src/App.tsx`, `src/main.tsx`, `src/index.css` remain (replaced in later steps).

- [ ] **Step 3: Do NOT install yet / do NOT commit** — config rewrites land first (Task B2–B7), then a single install + commit in Task B8. (No commit this step.)

### Task B2: Pin dependencies & scripts in `starter/package.json`

**Files:**
- Modify: `starter/package.json`

- [ ] **Step 1: Replace `starter/package.json` with the canonical manifest**

```json
{
  "name": "{{PROJECT_NAME}}",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "description": "{{DESCRIPTION}}",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "typecheck": "tsc -b --noEmit",
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "coverage:check": "node scripts/coverage-ratchet.mjs",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed"
  },
  "dependencies": {
    "@studio-manfred/manfred-design-system": "^0.22.0",
    "clsx": "^2.1.1",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^2.5.5"
  },
  "devDependencies": {
    "@axe-core/playwright": "^4.10.1",
    "@eslint/js": "^9.17.0",
    "@playwright/test": "^1.49.1",
    "@tailwindcss/vite": "^4.0.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^22.10.2",
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "@vitejs/plugin-react": "^4.3.4",
    "@vitest/coverage-v8": "^2.1.8",
    "eslint": "^9.17.0",
    "eslint-plugin-jsx-a11y": "^6.10.2",
    "eslint-plugin-react-hooks": "^5.1.0",
    "eslint-plugin-react-refresh": "^0.4.16",
    "globals": "^15.14.0",
    "jsdom": "^25.0.1",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.2",
    "typescript-eslint": "^8.18.1",
    "vite": "^6.0.5",
    "vitest": "^2.1.8"
  }
}
```
Note: `{{PROJECT_NAME}}` / `{{DESCRIPTION}}` are bootstrap placeholders; the starter itself is validated by temporarily having these literal — `npm install` tolerates a non-spec name only if it is lowercase. To keep the starter installable during development, set `"name": "manfred-starter"` while building, and convert it to `"{{PROJECT_NAME}}"` in Task D-final (Task D5). Use `manfred-starter` for now.

- [ ] **Step 2: Set the installable name for development**

In `starter/package.json` set `"name": "manfred-starter"` and `"description": "Manfred Vite SPA starter"` for now (placeholders are reintroduced in Task D5).

### Task B3: Vite + Tailwind v4 config

**Files:**
- Modify: `starter/vite.config.ts`
- Create: `starter/src/index.css`

- [ ] **Step 1: Replace `starter/vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

- [ ] **Step 2: Replace `starter/src/index.css`** (Tailwind v4 single-import + DS styles)

```css
@import 'tailwindcss';
@import '@studio-manfred/manfred-design-system/styles';
```

### Task B4: TypeScript config (path alias + node types)

**Files:**
- Modify: `starter/tsconfig.app.json`
- Modify: `starter/tsconfig.node.json` (leave Vite default; no change needed if it already includes `vite.config.ts`)

- [ ] **Step 1: Edit `starter/tsconfig.app.json`** — add the `@/*` path alias under `compilerOptions`

Ensure `compilerOptions` contains:
```json
{
  "baseUrl": ".",
  "paths": { "@/*": ["./src/*"] }
}
```
(Merge into the existing `compilerOptions`; keep all Vite defaults like `"strict": true`, `"jsx": "react-jsx"`, `"moduleResolution": "bundler"`.)

### Task B5: ESLint flat config with jsx-a11y ratchet

**Files:**
- Create: `starter/eslint.config.js`
- Delete: any default `starter/eslint.config.js` from the Vite template (overwrite).

- [ ] **Step 1: Write `starter/eslint.config.js`**

```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // WoW ratchet: a11y rules ship at `error` in the clean starter. When a
      // real project inherits violations, demote the offending rule to `warn`,
      // then promote it back to `error` in the same PR that fixes the last one.
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/no-autofocus': ['error', { ignoreNonDOM: false }],
    },
  },
])
```

### Task B6: Vitest config + setup

**Files:**
- Create: `starter/vitest.config.ts`
- Create: `starter/test/setup.ts`

- [ ] **Step 1: Write `starter/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    css: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/main.tsx', 'src/vite-env.d.ts'],
    },
  },
})
```

- [ ] **Step 2: Write `starter/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
```

### Task B7: The `cn()` helper, the example component, and their tests (TDD)

**Files:**
- Create: `starter/src/lib/utils.ts`
- Create: `starter/src/lib/utils.test.ts`
- Create: `starter/src/components/Greeting.tsx`
- Create: `starter/src/components/Greeting.test.tsx`
- Modify: `starter/src/App.tsx`
- Modify: `starter/src/main.tsx`

- [ ] **Step 1: Write the failing test for `cn()`**

`starter/src/lib/utils.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })
  it('drops falsy values', () => {
    expect(cn('a', false && 'b', undefined, 'c')).toBe('a c')
  })
  it('merges conflicting tailwind classes, last wins', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
})
```

- [ ] **Step 2: Run it, verify it fails**

Run: `cd starter && npx vitest run src/lib/utils.test.ts`
Expected: FAIL — `Failed to resolve import "./utils"` (file doesn't exist yet).

- [ ] **Step 3: Implement `cn()`**

`starter/src/lib/utils.ts`:
```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge class names with clsx, then resolve Tailwind conflicts (last wins). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `cd starter && npx vitest run src/lib/utils.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing test for `Greeting`** (the "extract a small unit, don't test the giant page" exemplar)

`starter/src/components/Greeting.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Greeting } from './Greeting'

describe('Greeting', () => {
  it('renders an accessible heading with the project name', () => {
    render(<Greeting name="Acme" />)
    expect(
      screen.getByRole('heading', { level: 1, name: /acme/i }),
    ).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run it, verify it fails**

Run: `cd starter && npx vitest run src/components/Greeting.test.tsx`
Expected: FAIL — cannot resolve `./Greeting`.

- [ ] **Step 7: Implement `Greeting`**

`starter/src/components/Greeting.tsx`:
```tsx
import { cn } from '@/lib/utils'

export function Greeting({ name, className }: { name: string; className?: string }) {
  return (
    <h1 className={cn('text-2xl font-semibold tracking-tight', className)}>
      Hello, {name}
    </h1>
  )
}
```

- [ ] **Step 8: Run it, verify it passes**

Run: `cd starter && npx vitest run src/components/Greeting.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 9: Wire `App.tsx` to use the DS Button + Greeting**

`starter/src/App.tsx`:
```tsx
import { Button } from '@studio-manfred/manfred-design-system'
import { Greeting } from '@/components/Greeting'

export default function App() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-start gap-6 p-8">
      <Greeting name="{{PROJECT_NAME}}" />
      <p className="text-muted-foreground">
        A Manfred starter — React + Vite + Tailwind + the Manfred design system.
      </p>
      <Button variant="brand">Get started</Button>
    </main>
  )
}
```
Note: keep `{{PROJECT_NAME}}` literal here — it is a bootstrap placeholder; the example test in Task C uses a substring match so it tolerates the token. If the DS export name `Button`/`variant="brand"` differs in `^0.22.0`, check the live Storybook (https://studio-manfred.github.io/manfred-design-system/) and adjust import/props to a real exported component; the test only asserts a `<button>` is present.

- [ ] **Step 10: Replace `main.tsx`** to import the stylesheet once at root

`starter/src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

### Task B8: Coverage ratchet script + baseline

**Files:**
- Create: `starter/scripts/coverage-ratchet.mjs`
- Create: `starter/.coverage-baseline.json`

- [ ] **Step 1: Write `starter/scripts/coverage-ratchet.mjs`**

```js
#!/usr/bin/env node
// Monotonic coverage ratchet. Fails if any metric drops more than TOLERANCE
// below .coverage-baseline.json. Bump the baseline up (never down) as coverage
// climbs. Reads coverage/coverage-summary.json (from `npm run test:coverage`).
import { readFileSync, writeFileSync } from 'node:fs'

const TOLERANCE = 0.5 // percentage points
const METRICS = ['statements', 'branches', 'functions', 'lines']

const summary = JSON.parse(readFileSync('coverage/coverage-summary.json', 'utf8'))
const baseline = JSON.parse(readFileSync('.coverage-baseline.json', 'utf8'))
const current = Object.fromEntries(METRICS.map((m) => [m, summary.total[m].pct]))

let failed = false
for (const m of METRICS) {
  const now = current[m]
  const base = baseline[m] ?? 0
  if (now < base - TOLERANCE) {
    failed = true
    console.error(`✗ ${m}: ${now}% is >${TOLERANCE}pp below baseline ${base}%`)
  } else {
    console.log(`✓ ${m}: ${now}% (baseline ${base}%)`)
  }
}

if (process.argv.includes('--update')) {
  const bumped = Object.fromEntries(
    METRICS.map((m) => [m, Math.max(current[m], baseline[m] ?? 0)]),
  )
  writeFileSync('.coverage-baseline.json', JSON.stringify(bumped, null, 2) + '\n')
  console.log('Baseline updated.')
}

process.exit(failed ? 1 : 0)
```

- [ ] **Step 2: Create a conservative starting baseline**

`starter/.coverage-baseline.json`:
```json
{
  "statements": 0,
  "branches": 0,
  "functions": 0,
  "lines": 0
}
```
(Bumped to real numbers in Step 5 once coverage runs.)

### Task B9: Install, run the full verify chain green, set the real baseline, commit

- [ ] **Step 1: Install dependencies**

Run: `cd starter && GITHUB_TOKEN="$GITHUB_TOKEN" npm install`
Requires a `.npmrc` for the DS scope — created in Task C/D, but needed now. Create `starter/.npmrc` first (it is also a WoW file; full content in Task D3):
```
@studio-manfred:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```
Then run the install. Expected: completes; `@studio-manfred/manfred-design-system` resolves.
If it returns 401, the `GITHUB_TOKEN` lacks `read:packages` — see `docs/knowledge/gotchas.md` (Task I2).

- [ ] **Step 2: Lint**

Run: `cd starter && npm run lint`
Expected: PASS, no errors.

- [ ] **Step 3: Typecheck**

Run: `cd starter && npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Unit tests with coverage**

Run: `cd starter && npm run test:coverage`
Expected: PASS (4 tests across 2 files); `coverage/coverage-summary.json` written.

- [ ] **Step 5: Set the real baseline, then verify the ratchet passes**

Run: `cd starter && node scripts/coverage-ratchet.mjs --update && npm run coverage:check`
Expected: baseline rewritten to the actual pct values; `coverage:check` exits 0.

- [ ] **Step 6: Build**

Run: `cd starter && npm run build`
Expected: PASS; `dist/` produced.

- [ ] **Step 7: Commit the starter app**

```bash
git add starter/ ':!starter/node_modules' ':!starter/dist' ':!starter/coverage'
git commit -m "feat(starter): runnable Vite SPA with DS, cn helper, example component, coverage ratchet"
```
Expected: `starter/node_modules`, `dist`, `coverage` excluded by the root `.gitignore`; source + config committed.

---

## Phase C — E2E, accessibility, CI in the starter

### Task C1: Playwright config (frontend-only — preview server)

**Files:**
- Create: `starter/playwright.config.ts`

- [ ] **Step 1: Write `starter/playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: { baseURL, trace: 'on-first-retry', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'chromium-mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

### Task C2: E2E smoke + a11y specs (TDD)

**Files:**
- Create: `starter/e2e/example.spec.ts`
- Create: `starter/e2e/a11y.spec.ts`

- [ ] **Step 1: Write `starter/e2e/example.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test('home renders the greeting and the primary action', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: /get started/i })).toBeVisible()
})
```

- [ ] **Step 2: Write `starter/e2e/a11y.spec.ts`** (axe sweep, warn-only unless `AXE_ENFORCE=1`)

```ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const ENFORCE = process.env.AXE_ENFORCE === '1'

test('home page has no detectable axe violations', async ({ page }) => {
  await page.goto('/')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  if (results.violations.length > 0) {
    const summary = results.violations
      .map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s)`)
      .join('\n')
    console.warn(`axe found violations:\n${summary}`)
  }
  if (ENFORCE) {
    expect(results.violations).toEqual([])
  }
})
```

- [ ] **Step 3: Run E2E, verify it passes**

Run: `cd starter && npx playwright install --with-deps chromium && npm run test:e2e`
Expected: PASS (4 runs: 2 specs × 2 projects). The a11y spec passes (warn-only).

- [ ] **Step 4: Commit**

```bash
git add starter/playwright.config.ts starter/e2e
git commit -m "test(starter): playwright smoke + axe a11y sweep (warn-only via AXE_ENFORCE)"
```

### Task C3: CI workflow + PR template

**Files:**
- Create: `starter/.github/workflows/ci.yml`
- Create: `starter/.github/PULL_REQUEST_TEMPLATE.md`

- [ ] **Step 1: Write `starter/.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
    paths-ignore: ["**/*.md"]
  pull_request:
    branches: [main]
    paths-ignore: ["**/*.md"]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

permissions:
  contents: read
  packages: read

jobs:
  verify:
    name: Lint, typecheck, unit tests, coverage ratchet, build
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - name: Install dependencies
        run: npm ci
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - name: Lint
        run: npm run lint
      - name: Typecheck
        run: npm run typecheck
      - name: Unit + component tests with coverage
        run: npm run test:coverage
      - name: Coverage ratchet gate
        run: npm run coverage:check
      - name: Build
        run: npm run build

  e2e:
    name: Playwright E2E (Chromium desktop + mobile)
    runs-on: ubuntu-latest
    needs: verify
    timeout-minutes: 15
    env:
      AXE_ENFORCE: "0"
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - name: Install dependencies
        run: npm ci
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - name: Resolve Playwright version
        id: pw
        run: echo "version=$(node -p "require('./package-lock.json').packages['node_modules/@playwright/test'].version")" >> "$GITHUB_OUTPUT"
      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ steps.pw.outputs.version }}
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      - name: Run E2E
        run: npm run test:e2e
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: starter/playwright-report
          retention-days: 14
          if-no-files-found: ignore
```
Note: CI runs with the working directory at the repo root of a *generated* project (where `starter/`'s contents become the root). The `path:` for the report assumes that layout; if running the workflow inside `my-process` for the template itself, it is `playwright-report`. Generated projects get the file at their root, so adjust the artifact path to `playwright-report` during bootstrap is unnecessary — the file ships as-is and is correct once `starter/` is the project root.

- [ ] **Step 2: Write `starter/.github/PULL_REQUEST_TEMPLATE.md`**

```markdown
## Summary
<!-- One or two sentences. What changed? -->

## Why
<!-- The problem / ticket context. -->

## Test plan
<!-- How you verified: commands run, what you observed. -->

## Tests added
<!-- New unit / e2e / a11y tests, or why none were needed. -->

## Coverage
<!--
The ratchet (scripts/coverage-ratchet.mjs) enforces that statements / branches /
functions / lines never drop more than 0.5pp below .coverage-baseline.json.
Run `npm run test:coverage && npm run coverage:check` locally before pushing.
-->

## Linked issues
<!-- e.g. Closes {{LINEAR_PREFIX}}-XXX, Refs {{LINEAR_PREFIX}}-YYY -->
```

- [ ] **Step 3: Commit**

```bash
git add starter/.github
git commit -m "ci(starter): GitHub Actions verify + e2e jobs and PR template"
```

---

## Phase D — WoW files baked into the starter

### Task D1: `AGENTS.md` (generic agent guidance)

**Files:**
- Create: `starter/AGENTS.md`

- [ ] **Step 1: Write `starter/AGENTS.md`** with these sections (concrete content, not placeholders):
  - **What this project is** — one line using `{{PROJECT_NAME}}` / `{{DESCRIPTION}}`.
  - **Stack at a glance** — React 19 + Vite + Tailwind v4 + shadcn/Radix + `@studio-manfred/manfred-design-system`; Vitest + Playwright + axe; Vercel.
  - **Commands** — the npm scripts table from `package.json` with one-line glosses, incl. `AXE_ENFORCE=1 npm run test:e2e`.
  - **The per-PR rhythm** — the 11-step rhythm (ticket-first → branch `feat/{{LINEAR_PREFIX}}-NNN-x` → failing test → green → docs in same PR → conventional commit naming the ticket → PR with `Closes {{LINEAR_PREFIX}}-NNN` → CI → squash-merge → ticket auto-closes).
  - **Governance guardrails (ask before doing)** — destructive actions, schema/data migrations, deleting files you didn't create, anything outward-facing: confirm first.
  - **Testing & TDD** — the Iron Law, the TDD trigger list, "extract a helper, don't test the giant component", the two regression-locking patterns (`test.fail()` / warn-only-with-flag ratchet).
  - **Accessibility** — semantic HTML, ARIA, keyboard nav; jsx-a11y + axe; warn→enforce ratchet.
  - **Knowledge & memory** — update `MEMORY.md` at session close; log errors to `knowledge/ERRORS.md`; graduate recurring truths up.

  Use the validated content from the spec §5.3 and the generalized `docs/ways-of-working.md` (Phase H) as the source of truth — AGENTS.md is the short operational form.

- [ ] **Step 2: Commit**

```bash
git add starter/AGENTS.md
git commit -m "docs(starter): add AGENTS.md operational guidance"
```

### Task D2: `CLAUDE.md` + `MEMORY.md`

**Files:**
- Create: `starter/CLAUDE.md`
- Create: `starter/MEMORY.md`

- [ ] **Step 1: Write `starter/CLAUDE.md`**

```markdown
@AGENTS.md

# CLAUDE.md — {{PROJECT_NAME}}

Project-scoped guidance for Claude Code. `AGENTS.md` (imported above) carries the
operational rules — the rhythm, testing, a11y, knowledge. This file adds what is
specific to **{{PROJECT_NAME}}**.

## What this is
{{DESCRIPTION}}

## Linear
- Team prefix: `{{LINEAR_PREFIX}}` (tickets are `{{LINEAR_PREFIX}}-NNN`).
- The ticket exists before the branch. Branch: `feat/{{LINEAR_PREFIX}}-NNN-short-desc`.

## Project-specific conventions
<!-- Fill in as the project grows: data layer, routing, page layout, sharp edges. -->

## Sharp edges
<!-- Log gotchas here as you hit them; graduate recurring ones to knowledge/. -->
```

- [ ] **Step 2: Write `starter/MEMORY.md`** (format + one worked example)

```markdown
# MEMORY — {{PROJECT_NAME}}

Session log. Newest first. One entry per working session; record what shipped,
what's half-done, and the next pickup point. Convert relative dates to absolute.

## YYYY-MM-DD — {{LINEAR_PREFIX}}-NNN · <short title> · <status>

- **Shipped:** what landed (PR #s).
- **Decisions:** non-obvious choices and why.
- **Next pickup:** the first thing to do next session.
```

- [ ] **Step 3: Commit**

```bash
git add starter/CLAUDE.md starter/MEMORY.md
git commit -m "docs(starter): add CLAUDE.md (imports AGENTS) and MEMORY.md template"
```

### Task D3: `knowledge/` flywheel scaffold + `.npmrc` (confirm)

**Files:**
- Create: `starter/knowledge/INDEX.md`
- Create: `starter/knowledge/ERRORS.md`
- Confirm: `starter/.npmrc` (created in Task B9 Step 1)

- [ ] **Step 1: Write `starter/knowledge/INDEX.md`**

```markdown
# Knowledge Index — {{PROJECT_NAME}}

Progressive disclosure: read top-down, load only what you need. This is the
per-project flywheel. When a fact turns out to recur across projects, graduate it
**up** into the team base at `my-process/docs/knowledge/`.

## Categories

### Domain
<!-- What things are: product context, APIs, naming, team decisions. -->

### Procedural
<!-- How to do things: deploy steps, test commands, review flows. -->

### Audit & status
<!-- Read-only audits, prioritised findings, remediation order. -->

### Plans
<!-- Decomposition plans for larger pieces of work. -->

## Maintenance rules
- Review at session start; merge overlaps; split files that grow too long.
- Remove inaccurate knowledge. Create categories when patterns emerge.
- `ERRORS.md` is the error log (see its header for the format).
```

- [ ] **Step 2: Write `starter/knowledge/ERRORS.md`**

```markdown
# Errors — {{PROJECT_NAME}}

Project-local error log.

- **Deterministic errors** (bad schema, wrong type, missing field) → conclude
  immediately, fix, link the conclusion into a category file.
- **Infrastructure errors** (timeout, rate limit, network) → log only; no
  conclusion until a pattern emerges.

Format:

\`\`\`markdown
## YYYY-MM-DD — short title

- **Symptom:**
- **Cause:**
- **Fix / conclusion:**
- **Graduated to:** knowledge/<category> or my-process/docs/knowledge/ (when recurring)
\`\`\`
```

- [ ] **Step 3: Confirm `starter/.npmrc` exists** with the GitHub Packages registry line (from Task B9). If missing, create it now.

- [ ] **Step 4: Commit**

```bash
git add starter/knowledge starter/.npmrc
git commit -m "docs(starter): knowledge flywheel scaffold (INDEX + ERRORS) and DS registry .npmrc"
```

### Task D4: Starter README (the generated app's readme)

**Files:**
- Create: `starter/README.md`

- [ ] **Step 1: Write `starter/README.md`** with: project title `{{PROJECT_NAME}}`, `{{DESCRIPTION}}`, a "Quick start" (`npm install` with the `GITHUB_TOKEN` note, `npm run dev`), the scripts table, where the WoW lives (`AGENTS.md` / `CLAUDE.md` / `MEMORY.md` / `knowledge/`), and a "Testing" section (unit/e2e/a11y + the coverage ratchet). Keep it short; link to the my-process docs for the full WoW.

- [ ] **Step 2: Commit**

```bash
git add starter/README.md
git commit -m "docs(starter): add README for generated projects"
```

### Task D5: Reintroduce placeholders, re-verify install/build still green

**Files:**
- Modify: `starter/package.json`

- [ ] **Step 1: Swap the dev name back to placeholders**

In `starter/package.json` set `"name": "{{PROJECT_NAME}}"` and `"description": "{{DESCRIPTION}}"`.

- [ ] **Step 2: Verify the placeholdered starter still parses**

Run: `cd starter && node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json valid JSON')"`
Expected: prints "package.json valid JSON" (placeholders are valid JSON string values).
Note: `npm install` against a `{{PROJECT_NAME}}` name will warn about an invalid name — that is expected for the template; the bootstrap swaps it before any real install. Do NOT run `npm install` here.

- [ ] **Step 3: Commit**

```bash
git add starter/package.json
git commit -m "chore(starter): restore {{PROJECT_NAME}} placeholders for bootstrap"
```

---

## Phase E — Overlay manifest

### Task E1: `overlay.manifest.json`

**Files:**
- Create: `overlay.manifest.json` (repo root)

- [ ] **Step 1: Write `overlay.manifest.json`**

```json
{
  "version": 1,
  "description": "Portable WoW overlay — drop into any repo, new or existing.",
  "files": [
    "AGENTS.md",
    "CLAUDE.md",
    "MEMORY.md",
    "knowledge/INDEX.md",
    "knowledge/ERRORS.md",
    ".github/workflows/ci.yml",
    ".github/PULL_REQUEST_TEMPLATE.md",
    "eslint.config.js",
    "vitest.config.ts",
    "test/setup.ts",
    "playwright.config.ts",
    "e2e/a11y.spec.ts",
    "scripts/coverage-ratchet.mjs",
    "vercel.json"
  ],
  "placeholders": ["PROJECT_NAME", "LINEAR_PREFIX", "DESCRIPTION"],
  "mergeHints": {
    "package.json": "Add the devDeps + scripts printed by bootstrap; the script never overwrites an existing package.json."
  }
}
```
Note: `vercel.json` is listed — create it in the next step so the manifest stays honest.

- [ ] **Step 2: Create `starter/vercel.json`** (SPA rewrite)

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Step 3: Commit**

```bash
git add overlay.manifest.json starter/vercel.json
git commit -m "feat: add overlay manifest and SPA vercel.json"
```

> The "manifest honesty" test (every listed path exists in `starter/`) is written in Task F4.

---

## Phase F — `bootstrap.mjs` core (file copy + placeholders), TDD

> The script is dependency-free Node ESM. Pure logic is exported for tests; `main()` runs only when executed directly. Tests use `node:test` + `node:assert`.

### Task F1: Module skeleton + `parseArgs` (TDD)

**Files:**
- Create: `scripts/bootstrap.mjs`
- Create: `scripts/bootstrap.test.mjs`

- [ ] **Step 1: Write the failing test**

`scripts/bootstrap.test.mjs`:
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseArgs } from './bootstrap.mjs'

test('parseArgs reads mode and flags', () => {
  const a = parseArgs(['new', '--name', 'acme', '--prefix', 'STU', '--dir', '../acme'])
  assert.equal(a.mode, 'new')
  assert.equal(a.name, 'acme')
  assert.equal(a.prefix, 'STU')
  assert.equal(a.dir, '../acme')
})

test('parseArgs reads boolean provisioning + safety flags', () => {
  const a = parseArgs(['overlay', '--dir', '.', '--github', '--no-provision', '--yes', '--dry-run'])
  assert.equal(a.mode, 'overlay')
  assert.equal(a.github, true)
  assert.equal(a.noProvision, true)
  assert.equal(a.yes, true)
  assert.equal(a.dryRun, true)
})
```

- [ ] **Step 2: Run it, verify it fails**

Run: `node --test scripts/bootstrap.test.mjs`
Expected: FAIL — cannot import `parseArgs`.

- [ ] **Step 3: Implement the skeleton + `parseArgs`**

`scripts/bootstrap.mjs`:
```js
#!/usr/bin/env node
import { fileURLToPath } from 'node:url'

const BOOL_FLAGS = new Set([
  'github', 'vercel', 'linear', 'no-provision', 'public',
  'linear-seed', 'yes', 'dry-run', 'force',
])
const VALUE_FLAGS = new Set(['name', 'prefix', 'dir', 'description', 'linear-team'])

const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase())

export function parseArgs(argv) {
  const out = { mode: undefined }
  if (argv[0] && !argv[0].startsWith('--')) out.mode = argv[0]
  for (let i = out.mode ? 1 : 0; i < argv.length; i++) {
    const tok = argv[i]
    if (!tok.startsWith('--')) continue
    const key = tok.slice(2)
    if (BOOL_FLAGS.has(key)) out[camel(key)] = true
    else if (VALUE_FLAGS.has(key)) out[camel(key)] = argv[++i]
  }
  return out
}

async function main() {
  // wired in Task G6
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(e); process.exit(1) })
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `node --test scripts/bootstrap.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/bootstrap.mjs scripts/bootstrap.test.mjs
git commit -m "feat(bootstrap): module skeleton + parseArgs (TDD)"
```

### Task F2: `swapPlaceholders` (TDD)

**Files:**
- Modify: `scripts/bootstrap.mjs`
- Modify: `scripts/bootstrap.test.mjs`

- [ ] **Step 1: Add the failing test**

Append to `scripts/bootstrap.test.mjs`:
```js
import { swapPlaceholders } from './bootstrap.mjs'

test('swapPlaceholders replaces all tokens', () => {
  const out = swapPlaceholders('{{PROJECT_NAME}} uses {{LINEAR_PREFIX}}-1 — {{DESCRIPTION}}', {
    PROJECT_NAME: 'acme', LINEAR_PREFIX: 'STU', DESCRIPTION: 'a demo',
  })
  assert.equal(out, 'acme uses STU-1 — a demo')
})

test('swapPlaceholders leaves unknown tokens untouched', () => {
  assert.equal(swapPlaceholders('{{UNKNOWN}}', { PROJECT_NAME: 'x' }), '{{UNKNOWN}}')
})
```

- [ ] **Step 2: Run, verify fail** — Run: `node --test scripts/bootstrap.test.mjs` → FAIL (no `swapPlaceholders`).

- [ ] **Step 3: Implement** — add to `scripts/bootstrap.mjs`:
```js
export function swapPlaceholders(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m))
}
```

- [ ] **Step 4: Run, verify pass** — `node --test scripts/bootstrap.test.mjs` → PASS.

- [ ] **Step 5: Commit**
```bash
git add scripts/bootstrap.mjs scripts/bootstrap.test.mjs
git commit -m "feat(bootstrap): swapPlaceholders (TDD)"
```

### Task F3: `resolveFileList` (TDD)

**Files:**
- Modify: `scripts/bootstrap.mjs`, `scripts/bootstrap.test.mjs`

- [ ] **Step 1: Add the failing test**
```js
import { resolveFileList } from './bootstrap.mjs'

test('resolveFileList(overlay) returns manifest files', () => {
  const manifest = { files: ['AGENTS.md', 'vercel.json'] }
  assert.deepEqual(resolveFileList('overlay', manifest, () => ['ignored']), ['AGENTS.md', 'vercel.json'])
})

test('resolveFileList(new) returns the full walked tree', () => {
  const walk = () => ['package.json', 'src/main.tsx', 'AGENTS.md']
  assert.deepEqual(resolveFileList('new', { files: ['AGENTS.md'] }, walk), ['package.json', 'src/main.tsx', 'AGENTS.md'])
})
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement**
```js
// walkFn() returns repo-relative paths under starter/. Injected for testability.
export function resolveFileList(mode, manifest, walkFn) {
  if (mode === 'overlay') return [...manifest.files]
  if (mode === 'new') return walkFn()
  throw new Error(`Unknown mode: ${mode}`)
}
```

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit**
```bash
git add scripts/bootstrap.mjs scripts/bootstrap.test.mjs
git commit -m "feat(bootstrap): resolveFileList for new|overlay (TDD)"
```

### Task F4: `planCopy` collision logic + manifest-honesty test (TDD)

**Files:**
- Modify: `scripts/bootstrap.mjs`, `scripts/bootstrap.test.mjs`

- [ ] **Step 1: Add failing tests** (collision policy + the manifest honesty check)
```js
import { planCopy } from './bootstrap.mjs'
import { readFileSync, existsSync } from 'node:fs'

test('planCopy skips existing files by default, never plans package.json overwrite', () => {
  const exists = (p) => ['CLAUDE.md', 'package.json'].includes(p)
  const plan = planCopy(['AGENTS.md', 'CLAUDE.md', 'package.json'], exists, { force: false })
  assert.deepEqual(plan.write, ['AGENTS.md'])
  assert.deepEqual(plan.skip, ['CLAUDE.md'])
  assert.deepEqual(plan.mergeHint, ['package.json'])
})

test('planCopy with force overwrites existing (except package.json)', () => {
  const exists = (p) => ['CLAUDE.md', 'package.json'].includes(p)
  const plan = planCopy(['CLAUDE.md', 'package.json'], exists, { force: true })
  assert.deepEqual(plan.write, ['CLAUDE.md'])
  assert.deepEqual(plan.mergeHint, ['package.json'])
})

test('every overlay.manifest.json path exists in starter/', () => {
  const manifest = JSON.parse(readFileSync(new URL('../overlay.manifest.json', import.meta.url)))
  for (const rel of manifest.files) {
    const abs = new URL(`../starter/${rel}`, import.meta.url)
    assert.ok(existsSync(abs), `manifest references missing starter/${rel}`)
  }
})
```

- [ ] **Step 2: Run, verify the first two fail** (manifest test should already PASS from Phase D/E).

- [ ] **Step 3: Implement `planCopy`**
```js
// existsFn(targetRelPath) -> boolean. Pure decision; no IO.
export function planCopy(files, existsFn, { force }) {
  const plan = { write: [], skip: [], mergeHint: [] }
  for (const f of files) {
    if (f === 'package.json') { plan.mergeHint.push(f); continue }
    if (existsFn(f) && !force) plan.skip.push(f)
    else plan.write.push(f)
  }
  return plan
}
```

- [ ] **Step 4: Run, verify all pass.**

- [ ] **Step 5: Commit**
```bash
git add scripts/bootstrap.mjs scripts/bootstrap.test.mjs
git commit -m "feat(bootstrap): planCopy collision policy + manifest honesty test (TDD)"
```

---

## Phase G — `bootstrap.mjs` provisioning + wiring

### Task G1: `buildGithubCmd` (TDD)

**Files:** Modify `scripts/bootstrap.mjs`, `scripts/bootstrap.test.mjs`

- [ ] **Step 1: Failing test**
```js
import { buildGithubCmd } from './bootstrap.mjs'

test('buildGithubCmd defaults to private with push', () => {
  assert.deepEqual(buildGithubCmd({ PROJECT_NAME: 'acme' }, { public: false }),
    ['gh', ['repo', 'create', 'acme', '--source=.', '--remote=origin', '--push', '--private']])
})
test('buildGithubCmd --public flips visibility', () => {
  const [, args] = buildGithubCmd({ PROJECT_NAME: 'acme' }, { public: true })
  assert.ok(args.includes('--public') && !args.includes('--private'))
})
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement**
```js
export function buildGithubCmd(vars, { public: isPublic }) {
  return ['gh', ['repo', 'create', vars.PROJECT_NAME, '--source=.', '--remote=origin', '--push', isPublic ? '--public' : '--private']]
}
```

- [ ] **Step 4: Run, verify pass.** **Step 5: Commit** `feat(bootstrap): buildGithubCmd (TDD)`.

### Task G2: `buildVercelCmds` (TDD)

- [ ] **Step 1: Failing test**
```js
import { buildVercelCmds } from './bootstrap.mjs'

test('buildVercelCmds links the project then connects git', () => {
  assert.deepEqual(buildVercelCmds({ PROJECT_NAME: 'acme' }), [
    ['vercel', ['link', '--yes', '--project', 'acme']],
    ['vercel', ['git', 'connect']],
  ])
})
```

- [ ] **Step 2: Run, verify fail.** **Step 3: Implement**
```js
export function buildVercelCmds(vars) {
  return [
    ['vercel', ['link', '--yes', '--project', vars.PROJECT_NAME]],
    ['vercel', ['git', 'connect']],
  ]
}
```

- [ ] **Step 4: Run, verify pass.** **Step 5: Commit** `feat(bootstrap): buildVercelCmds (TDD)`.

### Task G3: `buildLinearMutation` (TDD)

- [ ] **Step 1: Failing test**
```js
import { buildLinearMutation } from './bootstrap.mjs'

test('buildLinearMutation creates a project for a team', () => {
  const m = buildLinearMutation({ PROJECT_NAME: 'Acme App' }, 'team-123')
  assert.match(m.query, /projectCreate/)
  assert.deepEqual(m.variables, { name: 'Acme App', teamIds: ['team-123'] })
})
```

- [ ] **Step 2: Run, verify fail.** **Step 3: Implement**
```js
export function buildLinearMutation(vars, teamId) {
  return {
    query: `mutation ProjectCreate($name: String!, $teamIds: [String!]!) {
      projectCreate(input: { name: $name, teamIds: $teamIds }) { success project { id url } }
    }`,
    variables: { name: vars.PROJECT_NAME, teamIds: [teamId] },
  }
}
```

- [ ] **Step 4: Run, verify pass.** **Step 5: Commit** `feat(bootstrap): buildLinearMutation (TDD)`.

### Task G4: `shouldProvision` gating (TDD)

- [ ] **Step 1: Failing test** (default-off; flag forces on; `--no-provision` wins; interactive answer respected)
```js
import { shouldProvision } from './bootstrap.mjs'

test('shouldProvision is off by default under --yes', () => {
  assert.equal(shouldProvision('github', { yes: true }, async () => 'y'), false)
})
test('shouldProvision honors an explicit flag', async () => {
  assert.equal(await shouldProvision('github', { github: true, yes: true }, async () => 'n'), true)
})
test('shouldProvision --no-provision overrides everything', async () => {
  assert.equal(await shouldProvision('github', { github: true, noProvision: true }, async () => 'y'), false)
})
test('shouldProvision asks interactively when no flag and not --yes', async () => {
  assert.equal(await shouldProvision('vercel', {}, async () => 'y'), true)
  assert.equal(await shouldProvision('vercel', {}, async () => 'n'), false)
})
```

- [ ] **Step 2: Run, verify fail.** **Step 3: Implement**
```js
// askFn(question) -> Promise<string>. Returns whether to run integration `name`.
export async function shouldProvision(name, args, askFn) {
  if (args.noProvision) return false
  if (args[name] === true) return true
  if (args.yes) return false // safe default in non-interactive runs
  const ans = await askFn(`Create ${name} resource for this project? [y/N] `)
  return /^y(es)?$/i.test((ans || '').trim())
}
```

- [ ] **Step 4: Run, verify pass.** **Step 5: Commit** `feat(bootstrap): shouldProvision gating (TDD)`.

### Task G5: IO helpers (no unit test — integration-only, kept thin)

**Files:** Modify `scripts/bootstrap.mjs`

- [ ] **Step 1: Add the thin IO helpers** (walk, copy, prompt, tool-presence, runners). These are deliberately minimal wrappers; logic lives in the tested pure functions above.
```js
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, copyFileSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const STARTER = join(ROOT, 'starter')

export function walkStarter(base = STARTER, prefix = '') {
  const out = []
  for (const entry of readdirSync(base)) {
    if (['node_modules', 'dist', 'coverage', 'playwright-report', 'test-results'].includes(entry)) continue
    const abs = join(base, entry)
    const rel = prefix ? `${prefix}/${entry}` : entry
    if (statSync(abs).isDirectory()) out.push(...walkStarter(abs, rel))
    else out.push(rel)
  }
  return out
}

function ask(rl, q) { return rl.question(q) }

function hasTool(bin) {
  const r = spawnSync(bin, ['--version'], { stdio: 'ignore' })
  return r.status === 0
}

function run(bin, args, opts = {}) {
  return spawnSync(bin, args, { stdio: 'inherit', ...opts })
}
```

- [ ] **Step 2: Commit** `chore(bootstrap): thin IO + tool-presence helpers`.

### Task G6: Wire `main()` (copy → git init → provision → report) + smoke test

**Files:** Modify `scripts/bootstrap.mjs`, `scripts/bootstrap.test.mjs`

- [ ] **Step 1: Implement `main()`** — orchestrate the tested pieces:
  1. `const args = parseArgs(process.argv.slice(2))`; validate `mode` ∈ {new, overlay} and required `dir`/`name`/`prefix` (interactive `ask` for any missing required value).
  2. Build `vars = { PROJECT_NAME, LINEAR_PREFIX, DESCRIPTION }`.
  3. `const manifest = JSON.parse(readFileSync(join(ROOT,'overlay.manifest.json')))`.
  4. `const files = resolveFileList(args.mode, manifest, walkStarter)`.
  5. `const plan = planCopy(files.map(toTargetRel), (p)=>existsSync(join(targetDir,p)), { force: !!args.force })`. In `overlay` mode, prompt per existing file unless `--yes`/`--force` (skip default). Respect `args.dryRun` (print plan, write nothing).
  6. For each `plan.write`: read from `starter/<src>`, `swapPlaceholders`, `mkdirSync(recursive)`, write to target. Print `plan.skip` and `plan.mergeHint` (print the devDeps/scripts to add).
  7. `new` mode: if target not a git repo, `run('git',['init'])`, add, commit "chore: scaffold from my-process template".
  8. Provisioning (skip entirely if `--no-provision`): for each of github/vercel/linear, `if (await shouldProvision(name, args, ask))` → check `hasTool`/cred; if present, `run(...build*Cmd...)` (or `fetch` for Linear using `process.env.LINEAR_API_KEY`); else print the manual fallback. Wrap each in try/catch; never throw out of `main`. Honor `args.dryRun` (print resolved commands, execute nothing). For GitHub, skip if an `origin` remote already exists (`git remote get-url origin`).
  9. Print the final report + "do this next" checklist (`npm install`, set `GITHUB_TOKEN` in `.npmrc`, push, etc.).

  Show this code in full when implementing; keep each branch small and delegate to the exported pure functions. Linear flow: resolve team via a GraphQL `teams(filter:{ key: { eq: $key } })` query (key = `LINEAR_PREFIX` or `--linear-team`), then POST `buildLinearMutation`. Read `LINEAR_API_KEY` from env only.

- [ ] **Step 2: Add a `main` smoke test via subprocess (dry-run, no side effects)**

Append to `scripts/bootstrap.test.mjs`:
```js
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

test('CLI dry-run for `new` writes nothing and prints a plan', () => {
  const script = fileURLToPath(new URL('./bootstrap.mjs', import.meta.url))
  const r = spawnSync('node', [script, 'new', '--name', 'tmp-acme', '--prefix', 'STU',
    '--dir', '/tmp/__mp_dryrun_should_not_exist__', '--description', 'x', '--dry-run', '--yes'],
    { encoding: 'utf8' })
  assert.equal(r.status, 0)
  assert.match(r.stdout, /dry-run|plan/i)
  assert.equal(existsSync('/tmp/__mp_dryrun_should_not_exist__'), false)
})
```

- [ ] **Step 3: Run the full suite, verify pass**

Run: `node --test scripts/bootstrap.test.mjs`
Expected: PASS (all unit tests + the dry-run smoke test).

- [ ] **Step 4: Manual end-to-end check (new mode, real copy into a temp dir)**

Run:
```bash
node scripts/bootstrap.mjs new --name tmp-acme --prefix STU --dir /tmp/mp-e2e --description "demo" --no-provision --yes
ls /tmp/mp-e2e && grep -RL "{{PROJECT_NAME}}" /tmp/mp-e2e/package.json
rm -rf /tmp/mp-e2e
```
Expected: files copied; `package.json` name is `tmp-acme` (no remaining `{{PROJECT_NAME}}`); no provisioning ran.

- [ ] **Step 5: Commit**
```bash
git add scripts/bootstrap.mjs scripts/bootstrap.test.mjs
git commit -m "feat(bootstrap): wire main (copy, git init, provisioning, report) + dry-run smoke test"
```

---

## Phase H — Generalized ways-of-working docs

> Source of truth to generalize from (read-only): `manfred-intranet/docs/ai-development-workflow.md` (16 sections) + `-overview.md`, and `Code/CLAUDE.md`. Generalization rule: keep each intranet-specific mechanism as the *concrete example*, but write surrounding guidance stack-agnostically (e.g. "E2E runs against a mock backend — in the intranet that's a mock Supabase server; wire yours per project").

### Task H1: `docs/ways-of-working.md` (the master)

**Files:** Create `docs/ways-of-working.md`

- [ ] **Step 1: Write the doc** with these 16 sections (mirroring the source so the deck maps 1:1), each generalized:
  0. The one idea — AI follows a written process; leverage is the process.
  1. Idea → Brainstorming (the hard-gate; spec output).
  2. Planning (writing-plans; bite-sized TDD tasks).
  3. Linear — ticket-first rule, epics/children, milestones/estimates, write discipline.
  4. Branching & naming (`feat/{{LINEAR_PREFIX}}-NNN-x`, conventional commits, file-naming matches directory).
  5. TDD — the Iron Law, the trigger list, "extract a helper", the two regression-locking patterns.
  6. The testing pyramid — unit+integration (Vitest), E2E (Playwright + mock backend), a11y (axe + jsx-a11y), and (where relevant) backend/edge tests + deployed-smoke.
  7. Multi-agent orchestration (dispatching-parallel-agents; many agents, one judge).
  8. Connecting to GitHub.
  9. CI — GitHub Actions (verify + e2e; paths-ignore md; coverage ratchet gate).
  10. Release to Vercel (preview per PR; promote on merge).
  11. Security (chokepoint guard + a test that can't regress; security-review).
  12. Linting & code standards (ESLint flat config; jsx-a11y warn→error ratchet).
  13. Dev frameworks & stack (point to `stack-and-conventions.md`).
  14. Knowledge management — the flywheel (MEMORY, knowledge/INDEX + ERRORS, graduate-up to `docs/knowledge/`).
  15. The per-feature rhythm (the 11-step loop, end-to-end).
  Each section: 1–4 short paragraphs; reference the starter file that implements it (e.g. `starter/.github/workflows/ci.yml`).

- [ ] **Step 2: Commit** `docs: add generalized ways-of-working master`.

### Task H2: `docs/ways-of-working-overview.md` (one-pager → deck spine)

**Files:** Create `docs/ways-of-working-overview.md`

- [ ] **Step 1: Write the one-pager** mirroring `-overview.md` and the deck spine (Hook → Context → Journey → Solution → Evidence → Ask): The pipeline (Idea → ship → learn), Phases at a glance, Tooling at a glance, **Five principles to teach**, **Governance guardrails (what the AI must ask before doing)**. Keep it to one screen.

- [ ] **Step 2: Commit** `docs: add one-page WoW overview mapped to the deck spine`.

### Task H3: `docs/superpowers-workflow.md` (the skill chain in depth)

**Files:** Create `docs/superpowers-workflow.md`

- [ ] **Step 1: Write the doc** covering, in order, with what each produces and where it's saved:
  - brainstorming (hard-gate; design spec → `docs/superpowers/specs/`).
  - writing-plans (plan → `docs/superpowers/plans/`; bite-sized TDD tasks).
  - executing-plans vs subagent-driven-development (fresh subagent per task, two-stage review).
  - dispatching-parallel-agents (independent tasks; many agents, one judge).
  - TDD, systematic-debugging, verification-before-completion.
  - requesting-code-review / receiving-code-review.
  - finishing-a-development-branch.
  - **Linear mapping:** plan phases → milestones; tasks → `{{LINEAR_PREFIX}}-NNN` tickets; epics for umbrellas. The join key `{{LINEAR_PREFIX}}-NNN` ties code ↔ tracker; `Closes` auto-closes on merge.
  - **Loop close:** docs/MEMORY/knowledge updates + reflections → graduate-up.

- [ ] **Step 2: Commit** `docs: add superpowers skill-chain workflow doc`.

### Task H4: `docs/stack-and-conventions.md`

**Files:** Create `docs/stack-and-conventions.md`

- [ ] **Step 1: Write the doc**: the canonical stack and *why* each choice; branching + conventional commits + file-naming conventions; the **design-system connection** — GitHub Packages auth (`.npmrc` + `GITHUB_TOKEN` with `read:packages`), `import '@studio-manfred/manfred-design-system/styles'` once at root, components via named imports, the live Storybook + MCP server for component APIs.

- [ ] **Step 2: Commit** `docs: add stack and conventions reference`.

### Task H5: `docs/using-this-repo.md`

**Files:** Create `docs/using-this-repo.md`

- [ ] **Step 1: Write the doc**: how to consume the scaffold — "Use this template" vs `bootstrap.mjs`; `new` vs `overlay` decision; the flags; the three placeholders; the one-time `.npmrc` token setup; what to edit first (CLAUDE.md project specifics, README). Include the exact bootstrap command examples from the spec.

- [ ] **Step 2: Commit** `docs: add using-this-repo consumption guide`.

---

## Phase I — Compounded cross-repo knowledge (`docs/knowledge/`)

> Distil from the read-only sources surveyed during brainstorming: every repo's `knowledge/ERRORS.md`, `knowledge/`, and CLAUDE.md "sharp edges". Do not invent — only record what was observed.

### Task I1: `docs/knowledge/INDEX.md`

**Files:** Create `docs/knowledge/INDEX.md`

- [ ] **Step 1: Write** the router: explains this is the *team-level* compounded base distilled from all Manfred repos, distinct from per-project `knowledge/`, fed by graduation. Link to `gotchas.md`, `domain.md`, `procedural.md`. **Step 2: Commit** `docs(knowledge): add compounded knowledge index`.

### Task I2: `docs/knowledge/gotchas.md`

**Files:** Create `docs/knowledge/gotchas.md`

- [ ] **Step 1: Write** the recurring traps, each as `## title` + Symptom/Cause/Fix:
  - Tailwind v4 ≠ v3 (single `@import 'tailwindcss'`, `@tailwindcss/vite`, no `tailwind.config` by default).
  - Design-system install 401 — `GITHUB_TOKEN` needs `read:packages`; `.npmrc` registry line; rotate leaked PATs.
  - Vite bakes `VITE_*` at build time — breaks runtime URL override; use a request-intercept in E2E.
  - happy-dom ships a partial `localStorage` (prefer jsdom, or polyfill).
  - react-hooks 7.x compiler errors surface as lint failures — the warn→error ratchet handles the migration.
  - CSV row counts: use a quote-aware parser (naive `\n` split over-counts).
  
- [ ] **Step 2: Commit** `docs(knowledge): add cross-repo gotchas`.

### Task I3: `docs/knowledge/domain.md` and `docs/knowledge/procedural.md`

**Files:** Create both.

- [ ] **Step 1: Write `domain.md`** — recurring product/brand/design-system context: the design system is the single source of UI truth (Storybook + MCP); brand/tokens live in the DS; Linear team prefix convention; Vercel-per-project hosting.
- [ ] **Step 2: Write `procedural.md`** — cross-repo how-to: deploy to Vercel (preview per PR → promote on merge), Linear write-discipline, the warn→enforce + `test.fail()` ratchets, the coverage ratchet, the release/changelog flow.
- [ ] **Step 3: Commit** `docs(knowledge): add domain + procedural knowledge`.

---

## Phase J — README, onboarding, final verification, handoff

### Task J1: Root `README.md` (the template front door)

**Files:** Create `README.md`

- [ ] **Step 1: Write** the onboarding front door:
  - 60-second pitch: what `my-process` is (Manfred's engineering WoW + scaffold).
  - "Use this template" section (GitHub button) **and** the `bootstrap.mjs` path.
  - `new` vs `overlay` decision table + exact commands (from the spec).
  - One-time setup: the `.npmrc` `GITHUB_TOKEN` (`read:packages`) for the design system.
  - Repo map: `docs/` (read this), `starter/` (what gets copied), `scripts/` (the tool), `overlay.manifest.json`.
  - Onboarding path for new devs: README → `docs/using-this-repo.md` → `docs/ways-of-working-overview.md` → deep dives.
  - A note: "This repo must be marked as a **Template repository** in GitHub Settings."

- [ ] **Step 2: Commit** `docs: add onboarding README front door`.

### Task J2: Update CHANGELOG and run the full verification sweep

**Files:** Modify `CHANGELOG.md`

- [ ] **Step 1: Move items under a dated release heading** in `CHANGELOG.md` (e.g. `## [0.1.0] - 2026-06-06`) summarizing the template's first cut.

- [ ] **Step 2: Run the starter's full green sweep** (the acceptance bar)

Run:
```bash
cd starter && GITHUB_TOKEN="$GITHUB_TOKEN" npm install \
  && npm run lint && npm run typecheck && npm run test:run \
  && npm run test:coverage && npm run coverage:check && npm run build \
  && npx playwright install --with-deps chromium && npm run test:e2e
cd ..
```
Expected: every command exits 0.

- [ ] **Step 3: Run the bootstrap test suite**

Run: `node --test scripts/bootstrap.test.mjs`
Expected: all PASS (incl. manifest honesty + dry-run smoke).

- [ ] **Step 4: Light docs link check**

Run:
```bash
node -e "const fs=require('fs');const p=require('path');function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p.join(d,e.name)):[p.join(d,e.name)])}; const md=walk('docs').filter(f=>f.endsWith('.md')); let bad=0; for(const f of md){const t=fs.readFileSync(f,'utf8'); for(const m of t.matchAll(/\]\((\.\.?\/[^)]+)\)/g)){const target=p.resolve(p.dirname(f),m[1].split('#')[0]); if(!fs.existsSync(target)){console.log('BROKEN',f,'->',m[1]);bad++}}} console.log(bad?('broken: '+bad):'all relative doc links resolve')"
```
Expected: "all relative doc links resolve".

- [ ] **Step 5: Commit**
```bash
git add CHANGELOG.md
git commit -m "docs: cut CHANGELOG 0.1.0 and pass full verification sweep"
```

### Task J3: Handoff note (manual GitHub steps)

**Files:** Create `docs/HANDOFF.md`

- [ ] **Step 1: Write `docs/HANDOFF.md`** listing the steps the agent cannot do: create the GitHub remote for `my-process` and `git push`; mark the repo as a **Template repository** in Settings; confirm the org has the `@studio-manfred` GitHub Packages read access for CI (`secrets.GITHUB_TOKEN` already has `packages: read` via the workflow `permissions`); optionally set `AXE_ENFORCE` policy.
- [ ] **Step 2: Commit** `docs: add handoff note for manual GitHub/template steps`.

---

## Self-Review

**1. Spec coverage** (each spec section → task):
- §4 layout → Phases A–J create every path in the tree. ✓
- §5.1 docs set (5 docs) → H1–H5. ✓
- §5.2 `docs/knowledge/` (INDEX, gotchas, domain, procedural) → I1–I3. ✓
- §5.3 runnable starter (app + WoW files + acceptance bar) → B1–B9, C1–C3, D1–D5; acceptance bar run in J2 Step 2. ✓
- §5.4 overlay manifest → E1; honesty test → F4. ✓
- §5.5 bootstrap (parse, resolve, collision, placeholder, git init, report; flags; dry-run) → F1–F4, G5–G6. ✓
- §5.6 provisioning (GitHub/Vercel/Linear; opt-in gating; fallback; never fatal; dry-run) → G1–G4 (pure builders + gating), G6 (wiring + fallbacks). ✓
- §6 verification (starter self-test, bootstrap tests incl. pure-builder + gating + manifest honesty + dry-run, docs link check) → J2 Steps 2–4, plus per-task TDD. ✓
- §7 distribution (git, README, template-repo, onboarding path) → J1, J3. ✓
- §8 presentation alignment → H2 (overview mirrors the deck spine). ✓
- §10 out-of-scope respected (no deck edit, no env-var/secret mgmt, no npm install in script, no Next variant, no npm publish, no presentation-map). ✓

**2. Placeholder scan:** No "TBD/TODO/implement later" in code steps; all config and script steps show full content. The `{{PROJECT_NAME}}` / `{{LINEAR_PREFIX}}` / `{{DESCRIPTION}}` tokens are intentional template placeholders, handled by `swapPlaceholders` and validated by the Task G6 e2e check. Doc-content tasks (H/I/J1) give explicit section lists + sources (prose, not code) — acceptable.

**3. Type/name consistency:** Exported function names used consistently across tasks and tests: `parseArgs`, `swapPlaceholders`, `resolveFileList`, `planCopy`, `buildGithubCmd`, `buildVercelCmds`, `buildLinearMutation`, `shouldProvision`, `walkStarter`. `planCopy` returns `{ write, skip, mergeHint }` in F4 and is consumed with those keys in G6. The coverage script is `scripts/coverage-ratchet.mjs` everywhere (package.json `coverage:check`, CI, manifest, PR template). The `.coverage-baseline.json` metric keys (statements/branches/functions/lines) match between the script and the baseline file.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-06-my-process-wow-scaffold.md`.
