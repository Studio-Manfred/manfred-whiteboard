# Handoff — manual steps for a human

These are the steps the bootstrap agent cannot perform. Work through them in order after the repo is in its final state.

---

## 1. Create the GitHub remote and push

No remote exists yet. Create it and push `main`:

```bash
gh repo create studio-manfred/my-process --private --source=. --remote=origin --push
```

Or create the repo in GitHub UI first, then:

```bash
git remote add origin git@github.com:studio-manfred/my-process.git
git push -u origin main
```

---

## 2. Mark the repo as a Template repository

In the GitHub repository → **Settings** → **General**, tick **Template repository**. This is what makes the "Use this template" button appear for consumers.

---

## 3. Confirm GitHub Packages access for CI

The starter CI workflow (`starter/.github/workflows/ci.yml`) declares `permissions: packages: read` and passes `secrets.GITHUB_TOKEN` to `npm ci`. Verify that:

- The `@studio-manfred` org exposes its packages with read access to all org members (or to this repo specifically).
- A first CI run succeeds after the remote push.

If CI fails on `npm ci` with a 401, check that the package scope is configured in the org's Packages settings.

---

## 4. Decide the `AXE_ENFORCE` policy

The E2E a11y suite runs axe-core on every page. By default it logs violations but does not fail the build (`AXE_ENFORCE` is unset / warn-only).

When the team is ready to block merges on a11y regressions:

1. Set `AXE_ENFORCE=1` as a repository secret or environment variable in CI.
2. Update the relevant note in [docs/ways-of-working-overview.md](ways-of-working-overview.md) to reflect the new policy.

---

## 5. Ensure contributors have a `read:packages` token locally

Anyone who runs `npm install` inside a generated project needs a GitHub token with `read:packages` scope. The fastest path:

```bash
gh auth token   # prints the token for the authenticated user
export GITHUB_TOKEN=$(gh auth token)
```

Add the export to `~/.zshrc` (or equivalent) so it is available in every shell. The `.npmrc` in every bootstrapped project already reads `GITHUB_TOKEN` from the environment.
