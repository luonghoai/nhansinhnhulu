# Rules — Git Workflow

## Branches
- `main` is always deployable.
- Feature branches: `feat/<area>-<short>` e.g. `feat/admin-members`.
- Fixes: `fix/<area>-<short>`. Chores: `chore/...`.

## Commits (Conventional Commits)
- `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `style:`.
- Scope optional: `feat(bot): add /myplan command`.
- Imperative mood, present tense. Keep subject ≤ 72 chars.

## PRs
- Small and focused. Link the phase/section from planning docs.
- Must pass: lint, typecheck, build (web), bot import/smoke.
- Include a short "what/why/how to test" in the description.
- One reviewer approval before merge (squash merge preferred).

## Per-phase tags
- Tag a milestone at each roadmap phase exit: `phase-1`, `phase-2`, ...
