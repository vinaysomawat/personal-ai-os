---
name: deploy
description: Ship a change to production for the vinay-ai-os Next.js app — bump the package.json patch version, verify a clean production build, commit, push to master, and confirm the Vercel auto-deploy actually went Ready with no build errors. Use whenever the user says "push it and deploy", "deploy this", "ship it", or similarly asks to get committed work live, in this repo.
metadata:
  author: vinaysomawat
  version: "1.0.0"
---

# Deploy

This repo auto-deploys `master` to Vercel production on push (see CLAUDE.md). "Deploy" always means: bump the version, prove the build is clean *before* pushing, push, then prove the remote build actually succeeded — never just push and assume it worked.

## Steps

1. **Bump the version.** Read `package.json`, bump the patch component (e.g. `0.1.25` → `0.1.26`). This repo bumps on every deploy, not just on semantic-version-worthy changes — it's a deploy counter as much as a semver.

2. **Build clean, locally, first.** Run:
   ```
   npm run build
   ```
   This runs Next.js's type-check + lint + build in one step. It must finish with no errors (pre-existing ESLint warnings unrelated to your change are fine — don't chase those down). If it fails, fix the root cause before proceeding; don't push broken code hoping Vercel's build differs from local.

3. **Stage precisely, not broadly.** Use `git status` and `git diff` to see what's actually changed. Stage the specific files you intended to touch — never `git add -A` or `git add .` in this repo, since other in-progress edits (e.g. the user's own `backlog.md` notes) may be sitting in the working tree and shouldn't be swept into an unrelated commit. If a file like `backlog.md` was edited by the user to reflect exactly what this deploy addresses, it's fine to include it — check the diff first.

4. **Commit** with a message describing the *why*, ending with:
   ```
   Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
   ```
   Never `--amend`, never `--no-verify`.

5. **Push:**
   ```
   git push origin master
   ```

6. **Confirm the remote build, don't just trust the push.** Poll until the new deployment is done building, then inspect its logs:
   ```
   vercel ls
   # find the newest deployment (lowest "Age"), then:
   vercel inspect <deployment-url> --logs
   ```
   Poll with a Bash `run_in_background: true` + wait-for-notification, or an until-loop via Monitor — never a long foreground `sleep`. Confirm the final status line reads `status ● Ready` and the log tail shows `Build Completed` / `Deployment completed` with no error output above it.

7. **Report back** the deployment URL/status in one or two sentences — don't dump the full log to the user.

## Gotchas

- A clean local `npm run build` does not guarantee the Vercel build succeeds — env vars or platform differences can still break it remotely. Step 6 is not optional.
- Don't push before step 2 passes. Pushing broken code "to see if Vercel catches it" wastes a deploy cycle and leaves prod momentarily broken.
- If `npm run build` was run while a `next dev` server is also live, the dev server can get corrupted — kill dev server processes first if one is running (see the `dev-server-restart` skill).
