# Domain Knowledge

Shared product, brand, and design-system context that applies across all Manfred repos.

---

## Manfred Design System

The single source of UI truth for all projects.

- **Package:** `@studio-manfred/manfred-design-system` — published to GitHub Packages
  (`npm.pkg.github.com`). Requires a token with `read:packages`; see
  [gotchas.md](gotchas.md#design-system-install-fails-401-localvercel-403-ci).
- **Contents:** components (built on Radix UI), design tokens, global CSS reset. Tokens
  and theme live here — do not re-declare them per project.
- **Storybook:** live at the design system's Vercel deployment. The canonical reference
  for component APIs, props, and usage examples.
- **MCP server:** an MCP server surfaces component APIs to AI agents. Use it for
  accurate, up-to-date component signatures instead of guessing from source.
- **Versioning:** semver; pin the version in `package.json` and bump deliberately.

---

## Brand and Tokens

All colour, typography, spacing, and motion tokens are defined in the design system.
Projects consume them; they do not redefine them. If a token is missing, add it to the
design system first, then consume it downstream.

---

## Linear

Issue tracker for all active projects.

- **Team prefix:** each project has a prefix (e.g. `STU` for Studio Manfred). Tickets
  are written `STU-NNN`.
- **Branches:** name branches off the ticket — `feat/STU-NNN-short-description`.
- **Auto-close:** include `Closes STU-NNN` in the PR body. Linear auto-closes the ticket
  when the PR merges.
- A ticket must exist before a branch is created. If none exists, file one first.

---

## Hosting

- **Platform:** Vercel. Each project has its own Vercel project.
- **Preview deployments:** every PR gets a preview URL automatically.
- **Production:** merge to `main` promotes the build to production.
- **Env vars:** managed per project in the Vercel dashboard. Do not commit secrets;
  expose only `VITE_`/`NEXT_PUBLIC_` prefixed vars to the client (and remember they are
  baked at build — see [gotchas.md](gotchas.md#vite-bakes-vite_-env-vars-at-build-time)).
