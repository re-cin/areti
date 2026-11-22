# Contributing

## Branches
- `main` always runs. Do not commit to it directly.
- One branch per task: `feat/planner-engine`, `feat/timer`, `fix/stats-chart`, `chore/readme`.
- Pull `main` into your branch at least once a day to avoid huge conflicts.

## Commits
Small and often, with a clear message in the present tense: `Add timer endsAt calculation`.

## Pull requests
1. `npm run typecheck && npm test` pass.
2. Test it on a phone or emulator.
3. Describe what changed, with a screenshot for UI work.
4. One teammate approves before merging. Squash merge.

## Do not commit
`.env`, database files, keys, `node_modules`, build output.

## Changing the database
Edit `src/db/schema.ts`, run `npm run db:generate`, commit the new files in `drizzle/`.
Never edit a migration that is already on `main`; add a new one.

## Adding packages
`npx expo install <package>` for anything Expo or React Native related. Tell the team in the pull request.
Prefer popular, maintained packages.
