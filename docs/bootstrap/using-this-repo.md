# Using this repo

This repo is a GitHub template. It contains:

1. **`starter/`** — a runnable Vite SPA with the full ways-of-working baked in. This is the single source of truth for all scaffolded files.
2. **`scripts/bootstrap.mjs`** — a dependency-free Node script that stamps a new project from the starter, or applies the portable overlay to an existing repo. No `npm install` required to run the script itself.
3. **`docs/`** — the ways of working, stack conventions, superpowers workflow, and this guide.
4. **`overlay.manifest.json`** — the list of files that are part of the portable overlay (not all of `starter/`, just the WoW infrastructure files).

---

## Two modes: `new` vs `overlay`

### `new` — stamp a new project from the full starter

Copies the entire `starter/` directory into a new project folder, replaces the three placeholders, initialises a git repo with an initial commit, and optionally provisions GitHub, Vercel, and Linear.

Use when: you are starting a project from scratch and want the full runnable SPA as the base.

### `overlay` — apply the WoW files to an existing repo

Copies only the files listed in `overlay.manifest.json` into an existing repo. These are the infrastructure files: `AGENTS.md`, `CLAUDE.md`, `MEMORY.md`, `knowledge/INDEX.md`, `knowledge/ERRORS.md`, CI workflow, PR template, ESLint config, Vitest config, Playwright config, the axe E2E spec, the coverage ratchet, and `vercel.json`.

Existing files are skipped by default (prompted in interactive mode, silently skipped with `--yes`). The `package.json` is never overwritten — the script prints the `scripts` and `devDependencies` you need to merge in manually.

Use when: you have an existing codebase and want to layer in the WoW without replacing what is already there.

---

## The three placeholders

Every template file uses exactly three placeholders:

| Placeholder | What it becomes |
|---|---|
| `{{PROJECT_NAME}}` | The project name (used in `package.json`, `README.md`, `CLAUDE.md`) |
| `{{LINEAR_PREFIX}}` | The Linear team prefix, e.g. `STU` (tickets become `STU-NNN`) |
| `{{DESCRIPTION}}` | A one-line description of the project |

The bootstrap script replaces these at copy time. After running the script, no placeholder strings remain in the output.

---

## Command reference

### New project

```bash
node scripts/bootstrap.mjs new --name acme-app --prefix STU --dir ../acme-app
```

Interactive: prompts for missing values.

### New project with full provisioning (non-interactive)

```bash
node scripts/bootstrap.mjs new --name acme-app --prefix STU --dir ../acme-app --github --vercel --linear --linear-team STU --yes
```

Provisions a GitHub repo (via `gh`), links to Vercel (via `vercel` CLI), and creates a Linear project (via `LINEAR_API_KEY` env var). Skips all prompts.

### Overlay an existing repo

```bash
node scripts/bootstrap.mjs overlay --dir ../existing-repo --prefix STU
```

Applies the portable WoW overlay to an existing repo. Skips existing files (interactive prompt per file unless `--yes` is passed).

---

## All flags

### Required / common

| Flag | Type | Description |
|---|---|---|
| `--name` | value | Project name. Required for `new` mode; defaults to the target directory basename in `overlay` mode. |
| `--prefix` | value | Linear team prefix (e.g. `STU`). Required. |
| `--dir` | value | Target directory path. Required. |
| `--description` | value | One-line project description. Optional; defaults to empty string. |

### Provisioning

| Flag | Type | Description |
|---|---|---|
| `--github` | bool | Create a GitHub repo via `gh` CLI and push. |
| `--vercel` | bool | Link to Vercel via `vercel link` and `vercel git connect`. |
| `--linear` | bool | Create a Linear project via GraphQL API (`LINEAR_API_KEY` must be set). |
| `--linear-team` | value | Linear team key to create the project under (e.g. `STU`). Defaults to `--prefix`. |
| `--linear-seed` | bool | Create a first "Scaffold …" issue in the new Linear project. |
| `--no-provision` | bool | Skip all provisioning prompts (GitHub, Vercel, Linear). |
| `--public` | bool | Make the GitHub repo public. Default is private. |

### Safety

| Flag | Type | Description |
|---|---|---|
| `--yes` | bool | Non-interactive: skip all interactive prompts. Existing files are skipped silently in `overlay` mode. |
| `--force` | bool | Overwrite existing files without prompting. |
| `--dry-run` | bool | Print planned actions but do not write any files or run any commands. |

---

## One-time `.npmrc` token setup

The starter depends on `@studio-manfred/manfred-design-system`, a private GitHub Packages package. Before running `npm install` in a new project, you need a GitHub personal access token with `read:packages` scope.

The `.npmrc` in the project root is already configured:

```
@studio-manfred:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Set the token in your environment:

```bash
export GITHUB_TOKEN=$(gh auth token)   # if you have gh CLI authenticated
# or
export GITHUB_TOKEN=ghp_your_token_here
```

Then run `npm install`. Add the export to your `~/.zshrc` or `~/.bashrc` to avoid repeating it.

For CI, add `GITHUB_TOKEN` as a repository secret. The default `GITHUB_TOKEN` provided by Actions has `read:packages` permission for packages in the same organisation — no extra secret needed in most cases.

---

## What to edit first

After running the bootstrap script and `npm install`, do these in order:

1. **`CLAUDE.md`** — fill in the `## What this is` section with the project description, and add any project-specific conventions you already know. The `{{LINEAR_PREFIX}}` is already substituted.
2. **`README.md`** — replace the placeholder content with a real description of the project, how to run it, and any setup steps specific to this project.
3. **Run `npm run dev`** — verify the dev server starts. Fix any import errors (most likely a missing `GITHUB_TOKEN` for the design system package).
4. **Create the first Linear ticket** — the scaffold commit is your initial work. Create `{{LINEAR_PREFIX}}-1` ("Scaffold project") and close it pointing at the initial commit.

After that, follow the per-feature rhythm in [ways-of-working.md](./ways-of-working.md#15-the-per-feature-rhythm).
