# Contributing

ClaúGas is a proprietary, closed-development project (see
[`LICENSE`](LICENSE)) — this repo is public for transparency and
portfolio purposes, not for open external contributions. Pull requests
from outside the core team won't be merged.

That said, bug reports and suggestions are genuinely welcome — open an
issue if you spot something broken. For anything security-related, see
[`SECURITY.md`](SECURITY.md) instead of opening a public issue.

## Working on this repo (for the core team)

1. Create a branch off `main` — don't commit directly to `main`.
2. Run the checks locally before pushing:
   ```bash
   npm run typecheck
   npm run lint
   npm run build
   ```
   These also run automatically as a pre-push hook — a push will be
   blocked if the build or type-check fails.
3. Keep commits focused — one logical change per commit, with a clear
   message describing *why*, not just *what*.
4. Database changes go in a new file under `supabase/migrations/`,
   never editing an existing migration that's already been applied.
5. New environment variables need a matching entry in `.env.example`
   (frontend) or a note in `README.md` (Edge Function secrets).

## Commit messages

Plain, descriptive, present tense — e.g. `Fix delivery fee rounding for
quarters outside the base zone`, not `fix bug` or `updates`.
