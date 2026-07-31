# Commit Guide

This repo uses **Husky** + **lint-staged** to automatically lint and format your code every time you commit.

## What happens on `git commit`

Husky's `pre-commit` hook (`.husky/pre-commit`) runs:

```bash
pnpm exec lint-staged
```

`lint-staged` only touches the files you've staged (`git add`), and runs (see `package.json`):

| Staged files              | Commands run                        |
| ------------------------- | ----------------------------------- |
| `*.ts`, `*.tsx`, `*.mts`  | `eslint --fix` → `prettier --write` |
| `*.json`, `*.css`, `*.md` | `prettier --write`                  |

If any command fails (e.g. ESLint finds an error it can't auto-fix), the commit is **aborted** so bad code never lands.

## Normal workflow

```bash
git add <files>
git commit -m "your message"
```

That's it — Husky runs automatically, no extra step needed. If lint-staged modifies files (auto-fixes/formatting), those changes are re-staged and included in the commit automatically.

## If the commit is rejected

1. Read the error output — it'll point to the file and rule that failed.
2. Fix the issue manually (auto-fixable issues are already fixed for you).
3. `git add` the fixed file(s) again.
4. Re-run `git commit`.

You can also run all the checks yourself before committing, in one command:

```bash
pnpm run check
```

This runs `lint` → `format` → `format:check` in sequence across the whole repo (not just staged files). You can still run them individually if you only need one:

```bash
pnpm run lint          # check for lint errors
pnpm run format        # auto-format all files with Prettier
pnpm run format:check  # check formatting without writing changes
```

## First-time setup (new clone)

Husky hooks install automatically via the `prepare` script:

```bash
pnpm install   # triggers "prepare": "husky"
```

If hooks ever seem to not run (e.g. after cloning without `pnpm install`, or on a machine where hooks got disabled), re-run:

```bash
pnpm install
```

## Skipping the hook (avoid unless necessary)

```bash
git commit -m "message" --no-verify
```

Only use this for emergencies — it skips linting/formatting entirely and can let broken or unformatted code into the repo.
